import jwt from 'jsonwebtoken';
import { sendEmailToken } from "../services/emailService";
import multer from "multer";
import prisma from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || "SUPER SECRET";
const EMAIL_TOKEN_EXPIRATION_MINUTES = 10;
const AUTHENTICATION_EXPIRATION_HOURS = 12;
const AUTHENTICATION_EXPIRATION_MONTHS = 3;

//Generate a random 8 digit number as the email token
export function generateEmailToken(): string {
    return Math.floor(10000000 + (Math.random() * 90000000)).toString();
}

export function generateAuthToken(tokenId: number): string {
    const jwtPayload = { tokenId };

    return jwt.sign(jwtPayload, JWT_SECRET, {
        algorithm: "HS256",
        noTimestamp: true,
    });
}



export async function saveEmailToken(email: string) { // You should improve this method <----------------
    const emailToken = generateEmailToken();
    const expiration = new Date(Date.now() + EMAIL_TOKEN_EXPIRATION_MINUTES * 60 * 1000);

    try {
        const createdToken = await prisma.token.create({
            data: {
                type: 'EMAIL',
                emailToken,
                expiration,
                user: {
                    connect: {
                        email
                    }
                }
            }
        });

        await sendEmailToken(email, emailToken);

    } catch (err) {}
}



export async function saveDBTokens(email: string){
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

export const validateEmailFormat = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

//Set-up the multer configuration the upload files
export const uploader = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 5MB limit
});
