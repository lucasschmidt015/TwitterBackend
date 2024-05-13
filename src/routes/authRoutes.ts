import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken'
import { sendEmailToken } from "../services/emailService";

const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;
const AUTHENTICATION_EXPIRATION_HOURS = 12;
const AUTHENTICATION_EXPIRATION_MONTHS = 3;
const JWT_SECRET = process.env.JWT_SECRET || "SUPER SECRET";

const router = Router();
const prisma = new PrismaClient();

interface TokenRequest {
    email: string;
    emailToken: string;
}

interface checkToken {
    accessToken: string;
    refreshToken: string;
}

//Generate a random 8 digit number as the email token
function generateEmailToken(): string {
    return Math.floor(10000000 + (Math.random() * 90000000)).toString();
}

function generateAuthToken(tokenId: number): string {
    const jwtPayload = { tokenId };

    return jwt.sign(jwtPayload, JWT_SECRET, {
        algorithm: "HS256",
        noTimestamp: true,
    });
}

async function generateDBTokens(email: string){
    const dbAccessToken = await prisma.token.create({
        data: {
            type: "API",
            expiration: new Date(Date.now() + AUTHENTICATION_EXPIRATION_HOURS * 60 * 60 * 1000),
            user: {
                connect: {
                    email,
                }
            }
        }
    });

    const dbRefreshToken = await prisma.token.create({
        data: {
            type: "REFRESH",
            expiration: new Date(Date.now() + AUTHENTICATION_EXPIRATION_MONTHS * 30 * 24 * 60 * 60 * 1000),
            user: {
                connect: {
                    email,
                }
            }
        }
    });

    return { dbAccessToken, dbRefreshToken };
}

// Create a user, if it doesn't exist,
// Generate the emailToken and send it to their email
router.post('/login', async (req: Request<{}, {}, {email: string}>, res: Response) => {
    const { email } = req.body;


    if (!email) {
        return res.status(400).json({ error: 'Field E-mail is missing' });
    }

    //Generate a token
    const emailToken = generateEmailToken();
    const expiration = new Date(Date.now() + EMAIL_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    try {
        const createdToken = await prisma.token.create({
            data: {
                type: 'EMAIL',
                emailToken,
                expiration,
                user: {
                    connectOrCreate: {
                        where: { email },
                        create: { email }
                    }
                }
            }
        });

        await sendEmailToken(email, emailToken);
    } catch (err) {
        console.log('err <---- ', err);
        return res.status(500).json({ error: 'something bad happened' });
    }

    res.sendStatus(200);
});

// Here we should improve the error validarion <----------
router.post('/authenticate', async (req: Request<{}, {}, TokenRequest>, res: Response) => {
    const { email, emailToken } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'The email field was not provided' });
    }

    if (!emailToken) {
        return res.status(400).json({ error: 'The token field was not provided' });
    }

    const dbEmailToken = await prisma.token.findUnique({
        where: {
            emailToken
        },
        include: {
            user: true
        }
    })

    // Validade if the token exists on the database and if it's valid
    if (!dbEmailToken || !dbEmailToken.valid) {
        return res.sendStatus(401);
    }

    // Here we validate that the token is not expired yet
    if (dbEmailToken.expiration < new Date()) {
        return res.status(401).json({ error: 'The token has expired' });
    }

    // Here we validade that the user is the owner of the email
    if (dbEmailToken?.user?.email !== email) {
        return res.sendStatus(401);
    }
    
    //Create the token on the database
    const { dbAccessToken, dbRefreshToken } = await generateDBTokens(email);

    //Set the emailToken as invalid
    await prisma.token.update({
        where: {
            id: dbEmailToken.id
        },
        data: {
            valid: false,
        }
    })

    //Generate the JWT token
    const accessToken = generateAuthToken(dbAccessToken.id);
    const refreshToken = generateAuthToken(dbRefreshToken.id);
    
    return res.status(200).json({ accessToken, refreshToken });
})

router.post('/checkAccessToken', async (req: Request<{}, {}, checkToken>, res: Response) => {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken || !refreshToken) {
        return res.status(400).json({stillValid: false});
    }

    try {
        const payloadAccess = await jwt.verify(accessToken, JWT_SECRET) as { tokenId: number };

        if (!payloadAccess?.tokenId) {
            return res.status(401).json({stillValid: false});
        }

        const oldDBAcessToken = await prisma.token.findUnique({
            where: { id: payloadAccess.tokenId },
            include: {
                user: true,
            }
        })

        if (!oldDBAcessToken?.valid || oldDBAcessToken.expiration < new Date()) {
            
            const payloadRefresh = await jwt.verify(refreshToken, JWT_SECRET) as { tokenId: number };
         
            if (!payloadRefresh?.tokenId) {
                return res.status(401).json({stillValid: false});
            }

            const oldDBRefreshToken = await prisma.token.findUnique({
                where: {
                    id: payloadRefresh.tokenId,
                },
                include: {
                    user: true,
                }
            })

            if (!oldDBRefreshToken?.valid || oldDBRefreshToken.expiration < new Date()) {
                return res.status(200).json({ stillValid: false })
            }

            const { dbAccessToken, dbRefreshToken } = await generateDBTokens(oldDBRefreshToken.user.email);

            const newAccessToken = generateAuthToken(dbAccessToken.id);
            const newRefreshToken = generateAuthToken(dbRefreshToken.id);

            return res.status(200).json({ stillValid: false, UpdatedTokens: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            } })
        }

        return res
                .status(200)
                .json({ stillValid: true });
                
    } catch (err) {
        res.sendStatus(401);
    }
});



export default router;