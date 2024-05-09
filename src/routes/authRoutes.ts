import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken'
import { sendEmailToken } from "../services/emailService";

const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;
const AUTHENTICATION_EXPIRATION_HOURS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "SUPER SECRET";

const router = Router();
const prisma = new PrismaClient();

interface TokenRequest {
    email: string;
    emailToken: string;
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

//Validate the emailToken
//Generate a long-lived JWT token
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
    
    // Generate an API token
    const expiration = new Date(Date.now() + AUTHENTICATION_EXPIRATION_HOURS * 60 * 60 * 1000);

    //Create the token on the database
    const apiToken = await prisma.token.create({
        data: {
            type: "API",
            expiration,
            user: {
                connect: {
                    email,
                }
            }
        }
    });

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
    const authToken = generateAuthToken(apiToken.id);
    
    return res.status(200).json({ authToken });
})

export default router;