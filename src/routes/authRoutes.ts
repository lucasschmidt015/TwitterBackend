import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;

const router = Router();
const prisma = new PrismaClient();

//Generate a random 8 digit number as the email token
function generateEmailToken() {
    return Math.floor(10000000 + (Math.random() * 90000000)).toString();
}

// Create a user, if it doesn't exist,
// Generate the emailToken and send it to their email
router.post('/login', async (req, res) => {
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
    } catch (err) {
        console.log('err <---- ', err);
        return res.status(500).json({ error: 'something bad happened' });
    }

    res.sendStatus(200);
});

//Validate the emailToken
//Generate a long-lived JWT token
router.post('/authenticate', async (req, res) => {
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

    if (!dbEmailToken || !dbEmailToken.valid) {
        return res.sendStatus(401);
    }

    if (dbEmailToken.expiration < new Date()) {
        return res.status(401).json({ error: 'The token has expired' });
    }
    
    console.log(dbEmailToken.expiration)
    console.log(dbEmailToken);
    
    return res.sendStatus(200);
})

export default router;