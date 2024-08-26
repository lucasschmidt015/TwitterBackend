import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken'

//Controllers
import { startLogin, authenticateEmailToken, handleRefreshToken, handleLogout } from '../controllers/authController';

const router = Router();

// Generate the emailToken and send it to the user's email
router.post('/login', startLogin);

//This route will validade the email token sent to the user
router.post('/authenticate', authenticateEmailToken);

//This route will refresh the token
router.post('/refreshToken', handleRefreshToken);

//This route will invalidate the access token and the refresh token when the user logout
router.post('/logout', handleLogout)


export default router;