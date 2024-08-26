import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../../types';

const prisma = new PrismaClient();

/**
 * Creates a new tweet with the provided content and image for the authenticated user.
 * 
 * @param req - The authenticated request object containing user information.
 * @param res - The response object to send back the result.
 * @returns - A promise that resolves once the tweet is created and sent as a response.
 */
export const createTweet = async (req: AuthenticatedRequest, res: Response) => {
    const { content, image } = req.body;

    const user = req.user;

    try {

        if (!user) {
            return res.sendStatus(401);
        }

        const result = await prisma.tweet.create({
            data: {
                content,
                image,
                userId: user.id ,
            },
            include: {
                user: true,
            }
        });

        res.status(201).json(result);

    } catch (error) {
        res.status(400).json({ error: "Failed to create the post." });
    }
}

/**
 * Updates a tweet in the database.
 * 
 * @param req - The request object containing the tweet id in params and content/image in body.
 * @param res - The response object to send back the updated tweet or error message.
 * @returns - A promise that resolves once the tweet is updated or an error occurs.
 */
export const updateTweet = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { content, image } = req.body;

    try {
        const result = await prisma.tweet.update({
            where: { id: Number(id) },
            data: {
                content,
                image
            }
        });

        res.json(result)

    } catch(error) {
        res.status(400).json({error: `Failed to update the tweet.`});
    }
}

/**
 * Deletes a tweet from the database based on the provided tweet ID.
 * 
 * @param req - The request object containing the tweet ID in the parameters.
 * @param res - The response object to send back a status code.
 * @returns - A promise that resolves once the tweet is deleted.
 */
export const deleteTweet = async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.tweet.delete({
        where: { id: Number(id) }
    })

    res.sendStatus(200);
}

/**
 * Retrieves a list of tweets with detailed user information.
 * 
 * @param req - The request object.
 * @param res - The response object.
 * @returns - A promise that resolves with the list of tweets.
 */
export const listTweets = async (req: Request, res: Response) => {
    const allTweets = await prisma.tweet.findMany({ 
        include: {
            user: { 
                select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                } 
             }
        },
        orderBy: [
            { createdAt: 'desc' }
        ]
    });
    res.json(allTweets);
}

/**
 * Retrieves a tweet by its unique identifier.
 * 
 * @param req - The request object containing the tweet ID in the parameters.
 * @param res - The response object to send back the retrieved tweet.
 * @returns A JSON response with the tweet details, including the associated user.
 */
export const getTweetById = async (req: Request, res: Response) => {
    const { id } = req.params;

    const tweet = await prisma.tweet.findUnique({ where: { id: Number(id) }, include: { user: true } });

    res.json(tweet);
}
