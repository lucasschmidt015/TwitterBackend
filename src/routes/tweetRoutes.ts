import { Router, Request, Response } from 'express';
import { PrismaClient, User } from '@prisma/client';
import AWS from 'aws-sdk';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();
const s3 = new AWS.S3(); // AWS service that allow us to storage images/files in a scalable way

//Set-up the multer configuration the upload files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

type AuthRequest = Request & { user?: User }

// Create tweet
router.post('/', async (req: AuthRequest, res: Response) => {
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
                userId: user.id,
            },
            include: {
                user: true,
            }
        });

        res.status(201).json(result);

    } catch (error) {
        res.status(400).json({ error: "Failed to create the post." });
    }
});

// List tweet
router.get('/', async (req, res) => {
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
});

// Get one tweet
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const tweet = await prisma.tweet.findUnique({ where: { id: Number(id) }, include: { user: true } });

    res.json(tweet);
});

//Update tweet
router.put('/:id', async (req, res) => {
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
});

//Delete tweet
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    await prisma.tweet.delete({
        where: { id: Number(id) }
    })

    res.sendStatus(200);
});

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

router.post('/updateProfilePicture', upload.single('image'), async (req: MulterRequest, res: Response) => {

    if (!req.file) {
        return res.status(401).json({ error: 'Image not provided' });
    }

    const file = req.file; // Here we need to finish the flow, chat gpt examples bellow <-----
    
    try {
        const response = await s3.putObject({
            Body: 'Hello World',
            Bucket: 'image-storage-schmidt-lucas-torchelsen',
            Key: 'my-file.txt',
        }, (err, data) => {
            if (err) {
                throw new Error(err.message as string);
            }
        })

        res.sendStatus(200);
    }
    catch(err) {
        res.sendStatus(500);
    }
});

// import express from 'express';
// import multer from 'multer';
// import AWS from 'aws-sdk';
// import { v4 as uuidv4 } from 'uuid';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

// // Extend the Express Request interface
// interface MulterRequest extends express.Request {
//   file?: Express.Multer.File;
// }

// const app = express();

// // Configure AWS S3
// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

// // Configure multer storage
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
// });

// // Upload endpoint
// app.post('/updateProfilePicture', upload.single('image'), async (req: MulterRequest, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded.');
//   }

//   const file = req.file;
//   const fileName = `${uuidv4()}-${file.originalname}`;
//   const params = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: fileName,
//     Body: file.buffer,
//     ContentType: file.mimetype,
//     ACL: 'public-read',
//   };

//   try {
//     const data = await s3.upload(params).promise();
//     // Save data.Location (URL) and metadata to your database
//     res.status(200).send({ url: data.Location });
//   } catch (err) {
//     res.status(500).send(err);
//   }
// });

// // Start the server
// app.listen(3000, () => {
//   console.log('Server is up on port 3000');
// });


export default router;