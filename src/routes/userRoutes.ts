import { Router } from "express";
import { PrismaClient } from '@prisma/client';
import multer from 'multer';

import { authenticateToken } from '../middlewares/authMiddleware';
import { createUser, updateUser, deleteUser, updateProfilePicture, returnLoggedUser, listAllUsers, getUserById } from "../controllers/userController";

const router = Router();
const prisma = new PrismaClient();

//Set-up the multer configuration the upload files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

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
router.post('/updateProfilePicture', authenticateToken, upload.single('image'), updateProfilePicture);


export default router;