import { Router, Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import { User } from "../../types";
import { authenticateToken } from '../middlewares/authMiddleware';
import { validadeNewUser } from "./validations/userValidation";
import { saveEmailToken } from "../utils";
import AWS from 'aws-sdk';
import multer from 'multer';

const s3 = new AWS.S3(); // AWS service that allow us to storage images/files in a scalable way

const router = Router();
const prisma = new PrismaClient();

//Set-up the multer configuration the upload files
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  });

// Create User
router.post('/', async (req: Request<{}, {}, User>, res: Response) => {
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
    
});

interface AuthenticatedRequest extends Request {
    user?: any;
}

router.get('/loggedUser', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    
    if(!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
        });
    }

    res.status(200).json(req.user);
});

// List user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
    const allUser = await prisma.user.findMany();
    res.json(allUser);
});

// Get one user
router.get('/:id', async (req: Request<{ id: string }, {}, {}>, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: Number(id) }, include: { tweets: true } });

    res.json(user)
});


//Update User
router.put('/:id', authenticateToken, async (req: Request<{ id: string }, {}, User>, res: Response) => {
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
});

//Delete User
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.user.delete({
        where: { id: Number(id) }
    })

    res.sendStatus(200);
});

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

router.post('/updateProfilePicture', authenticateToken, upload.single('image'), async (req: MulterRequest, res: Response) => {

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