import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateToken } from '../middlewares/authMiddleware'
import { createTweet, updateTweet, deleteTweet, listTweets, getTweetById } from '../controllers/tweetController';

const router = Router();
const prisma = new PrismaClient();

// Create tweet
router.post('/', authenticateToken, createTweet);

// List tweet
router.get('/', authenticateToken, listTweets);

// Get one tweet
router.get('/:id', authenticateToken, getTweetById);

//Update tweet
router.put('/:id', authenticateToken, updateTweet);

//Delete tweet
router.delete('/:id', authenticateToken, deleteTweet);



export default router;