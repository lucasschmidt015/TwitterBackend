import jwt from 'jsonwebtoken';

import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

import { generateAuthToken, saveDBTokens, saveEmailToken } from "../utils";
import { loginValidation } from "../validations/authValidation";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER SECRET";

const prisma = new PrismaClient();

interface EmailTokenRequest {
    email: string;
    emailToken: string;
}


interface TokenRequest {
    accessToken: string;
    refreshToken: string;
}

/**
 * Handles the login process by validating the email provided in the request body,
 * saving an email token, and sending it to the user for verification.
 * 
 * @param req - The Express Request object containing the email in the body
 * @param res - The Express Response object to send the response
 * @returns - A Promise that resolves once the login process is completed
 */
export const startLogin = async (req: Request<{}, {}, {email: string}>, res: Response) => {
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
} 

/**
 * Authenticates an email token provided in the request body.
 * 
 * This function validates the email token against the database, checks its validity and expiration,
 * and ensures that the user associated with the token is the owner of the provided email.
 * If the token is valid, it generates access and refresh tokens, updates the email token's validity in the database,
 * and returns the access and refresh tokens in the response.
 * 
 * @param req - The request object containing the email and email token to authenticate.
 * @param res - The response object to send the authentication result.
 * @returns A JSON response with access and refresh tokens if authentication is successful, or an error message if authentication fails.
 */
export const authenticateEmailToken = async (req: Request<{}, {}, EmailTokenRequest>, res: Response) => {
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
}

/**
 * Handles the refresh token logic to generate new access and refresh tokens based on the provided tokens.
 * 
 * @param req - The request object containing the access and refresh tokens in the body.
 * @param res - The response object to send back the updated tokens or error status.
 * @returns A JSON response with the updated access and refresh tokens if successful, or an error status otherwise.
 */
export const handleRefreshToken = async (req: Request<{}, {}, TokenRequest>, res: Response) => {
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
         
            if (!payloadRefresh?.tokenId) { // Here lies our next test case
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
}

/**
 * Handles the logout process by invalidating the access and refresh tokens provided in the request body.
 * If both tokens are missing, it sends a 200 status response.
 * If the access token is provided, it verifies the token, extracts the token ID, and updates the corresponding token's validity in the database to false.
 * If the refresh token is provided, it follows a similar process as the access token to invalidate the refresh token.
 * Finally, it sends a 200 status response to indicate successful logout.
 * 
 * @param req - The request object containing the access and refresh tokens in the request body.
 * @param res - The response object used to send the HTTP response.
 */
export const handleLogout = async (req: Request<{}, {}, TokenRequest>, res: Response) => {
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
}