import { Router } from "express";
import { PrismaClient } from '@prisma/client';

import { authenticateToken } from '../middlewares/authMiddleware';
import { uploadFileMiddleware } from "../middlewares/uploadFileMiddleware";
import { createUser, updateUser, deleteUser, updateProfilePicture, returnLoggedUser, listAllUsers, getUserById } from "../controllers/userController";
import { uploader } from "../utils";

const router = Router();
const prisma = new PrismaClient();

// Create User
router.post('/', createUser);

//Return the logged user data
router.get('/loggedUser', authenticateToken, returnLoggedUser);

// List user
router.get('/', authenticateToken, listAllUsers);

// Get one user
router.get('/:id', authenticateToken, getUserById);

//Update User
router.put('/:id', authenticateToken, updateUser);

//Delete User
router.delete('/:id', authenticateToken, deleteUser);

//Updates the user's profile picture
// @ts-ignore
router.post('/updateProfilePicture', authenticateToken, uploader.single('image'), uploadFileMiddleware, updateProfilePicture);


export default router;