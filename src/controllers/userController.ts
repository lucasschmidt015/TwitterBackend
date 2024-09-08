import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';

import { validadeNewUser } from "../validations/userValidation";
import { saveEmailToken } from "../utils";
import { User, AuthenticatedRequest, updateProfilePictureRequest } from "../../types";
import { uploadNewFile, deleteDriveFile } from "../services/googleDrive";

const prisma = new PrismaClient();

/**
 * Creates a new user in the database and sends an email token for verification.
 * 
 * @param req - The request object containing the user's email, name, and username.
 * @param res - The response object to send back the result or error message.
 * @returns - A Promise that resolves once the user is created and the email token is saved.
 */
export const createUser = async (req: Request<{}, {}, User>, res: Response) => {
    const { email, name, username } = req.body

    const error = await validadeNewUser({email, username: username as string, name: name as string});

    if (error) {
        return res.status(error.statusCode).json({ error: error.error});
    }

    try {
        const result = await prisma.user.create({
            data: {
                email,
                name,
                username,
                bio: "Hello, I'm new on Twitter",
            }
        });

        await saveEmailToken(result.email);

        res.status(201).json(result);

    } catch (error) {
        res.status(400).json({ error: "Username and email should be unique." })
    }
}

/**
 * Updates user information in the database.
 * 
 * @param req - The request object containing the user id in the params and the updated user information in the body.
 * @param res - The response object to send back the result or error message.
 * @returns JSON response with the updated user information or an error message.
 */
export const updateUser = async (req: Request<{ id: string }, {}, User>, res: Response) => {
    const { id } = req.params;
    const { bio, name, image } = req.body;

    try {
        const result = await prisma.user.update({
            where: { id: Number(id) },
            data: {
                bio,
                name,
                image
            }
        });

        res.json(result)

    } catch(error) {
        res.status(400).json({error: `Failed to update the user.`});
    }

    res.status(501).json({ error: `Not implemented: ${id}` })
}

/**
 * Deletes a user from the database based on the provided user ID.
 * 
 * @param req - The request object containing the user ID in the parameters.
 * @param res - The response object to send back a success status.
 * @returns - A promise that resolves once the user is deleted.
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.user.delete({
        where: { id: Number(id) }
    })

    res.sendStatus(200);
}

/**
 * Returns the logged-in user information.
 * 
 * @param req - The authenticated request object containing the user information.
 * @param res - The response object to send back the user information.
 * @returns The user information of the logged-in user if authenticated, otherwise returns an error response with status code 401.
 */
export const returnLoggedUser = (req: AuthenticatedRequest, res: Response) => {
    if(!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
        });
    }

    res.status(200).json(req.user);
}

/**
 * Updates the profile picture of a user.
 * 
 * @param req - The request object containing the file to be uploaded and the user information.
 * @param res - The response object to send back the result.
 * @returns A JSON response indicating the success or failure of updating the profile picture.
 */
export const updateProfilePicture = async (req: updateProfilePictureRequest, res: Response) => {
    if (!req.file) {
        return res.status(401).json({ error: 'Image not provided' });
    }

    const file = req.file; 
    const user = req.user;
    const oldImage = user?.image;

    try {
        const response = await uploadNewFile(file);

        if (!response.id) {
            throw new Error("Failed to update the profile image.");
        }

        const updatedUser = await prisma.user.update({
            where: {
                email: user?.email
            }, 
            data: {
                image: response.id
            }
        });

        if (oldImage) {
            await deleteDriveFile(oldImage);
        }

        return res.status(201).json({success: "Profile picture updated successfully.", updatedUser});

    } catch (err) {
        return res.status(500).json({ error: err })
    }
}

/**
 * Retrieves all users from the database and sends a JSON response with the user data.
 * 
 * @param req - The request object from Express.
 * @param res - The response object from Express.
 * @returns A JSON response containing all users retrieved from the database.
 */
export const listAllUsers = async (req: Request, res: Response) => {
    const allUser = await prisma.user.findMany();
    res.json(allUser);
}

/**
 * Retrieves a user by their ID from the database and returns the user object along with their tweets.
 * 
 * @param req - The request object containing the user ID in the parameters.
 * @param res - The response object to send back the user data.
 * @returns A JSON response with the user object and their tweets if found, or an error message if not found.
 */
export const getUserById = async (req: Request<{ id: string }, {}, {}>, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: Number(id) }, include: { tweets: true } });

    res.json(user)
}