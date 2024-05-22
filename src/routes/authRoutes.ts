import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken'
import { sendEmailToken } from "../services/emailService";
import { loginValidation } from "./validations/authValidation";
import { generateAuthToken, saveDBTokens, saveEmailToken } from "../utils";

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

// Generate the emailToken and send it to their email
router.post('/login', async (req: Request<{}, {}, {email: string}>, res: Response) => {
    const { email } = req.body;

    const errors = await loginValidation(req.body);

    if (errors) {
        return res.status(errors.statusCode).json({ error: errors.error})
    }

    try {
        saveEmailToken(email);
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error, please try again later.' });
    }

    res.sendStatus(200);
});

// Here we should improve the error validarion, and the whole code <----------
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
        return res.status(401).json({ error: 'The password is invalid' });
    }

    // Here we validate that the token is not expired yet
    if (dbEmailToken.expiration < new Date()) {
        return res.status(401).json({ error: 'The password has expired' });
    }

    // Here we validade that the user is the owner of the email
    if (dbEmailToken?.user?.email !== email) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    
    //Create the token on the database
    const { dbAccessToken, dbRefreshToken } = await saveDBTokens(email);

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

            const { dbAccessToken, dbRefreshToken } = await saveDBTokens(oldDBRefreshToken.user.email);

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

//This route will invalidate the access token and the refresh token when the user logout
router.post('/logout', async (req, res) => {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken && !refreshToken) {
        return res.sendStatus(200);
    }

    if (accessToken) {
        const payloadAccess = await jwt.verify(accessToken, JWT_SECRET) as { tokenId: number };
        const accessId = payloadAccess.tokenId;
        if (accessId) {
            try {
                await prisma.token.update({
                    where: {
                        id: accessId,
                    },
                    data: {
                        valid: false
                    }
                });
            } catch (err) {
                console.log(err);
            }
        }
    }

    if (refreshToken) {
        const payloadRefresh = await jwt.verify(refreshToken, JWT_SECRET) as { tokenId: number };
        const refreshId = payloadRefresh.tokenId;
        if (refreshId) {
            try {
                await prisma.token.update({
                    where: {
                        id: refreshId,
                    },
                    data: {
                        valid: false,
                    }
                });
            } catch (err) {
                console.log(err);
            }
        }
    }


    res.sendStatus(200);
})



export default router;