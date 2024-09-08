import { Request, Response } from 'express';

export type User = {
    id: number;
    email: string;
    name?: string;
    username?: string;
    image?: string;
    bio?: string;
}

export type ValidationReturn = {
    error: string;
    statusCode: number;
};

export interface AuthenticatedRequest extends Request {
    user?: User;
}

export interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

export interface updateProfilePictureRequest extends MulterRequest {
    user?: User
}