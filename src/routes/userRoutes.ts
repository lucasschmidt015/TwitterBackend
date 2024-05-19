import { Router, Request, Response } from "express";
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface CreateBody {
    email: string,
    name: string,
    username: string
}

// Create User
router.post('/', async (req: Request<{}, {}, CreateBody>, res: Response) => {
    const { email, name, username } = req.body

    try {
        const result = await prisma.user.create({
            data: {
                email,
                name,
                username,
                bio: "Hello, I'm new on Twitter",
            }
        });

        res.status(201).json(result);

    } catch (error) {
        res.status(400).json({ error: "Username and email should be unique." })
    }
    
});

interface AuthenticatedRequest extends Request {
    user?: any;
}

router.get('/loggedUser', (req: AuthenticatedRequest, res: Response) => {
    
    if(!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
        });
    }

    res.status(200).json(req.user);
});

// List user
router.get('/', async (req: Request, res: Response) => {
    const allUser = await prisma.user.findMany();
    res.json(allUser);
});

// Get one user
router.get('/:id', async (req: Request<{ id: string }, {}, {}>, res: Response) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: Number(id) }, include: { tweets: true } });

    res.json(user)
});


interface updateParams {
    id: string;
}

interface updateBody {
    bio: string;
    name: string;
    image: string;
}

//Update User
router.put('/:id', async (req: Request<updateParams, {}, updateBody>, res: Response) => {
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
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    await prisma.user.delete({
        where: { id: Number(id) }
    })

    res.sendStatus(200);
});


export default router;