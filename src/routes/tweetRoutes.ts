import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

import { authenticateToken } from '../middlewares/authMiddleware'
import { createTweet, updateTweet, deleteTweet, listTweets, getTweetById } from '../controllers/tweetController';

const router = Router();
const prisma = new PrismaClient();

// Create tweet
router.post('/', createTweet);

// List tweet
router.get('/', listTweets);

// Get one tweet
router.get('/:id', getTweetById);

//Update tweet
router.put('/:id', updateTweet);

//Delete tweet
router.delete('/:id', deleteTweet);



export default router;