import { createTweet } from "../controllers/tweetController";
import { PrismaClient } from "@prisma/client";
import { createExpressInstance } from "./utilities";
import request from 'supertest';
import { Request, Response, NextFunction } from 'express'

const prisma = new PrismaClient();

interface UserRequest extends Request {
    user?: any;
}

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        tweet: {
            create: jest.fn()
        }
    }

    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    }
});

describe("Tweet Controller", () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("createTweet should return 401 if the user was not provided on the request", async () => {
        const app = createExpressInstance((req: UserRequest, res: Response) => {
            req.user = null;
            createTweet(req, res);
        });

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(401);
    });


    it("createTweet should return a custom error response if the tweet creating fails", async () => {
        (prisma.tweet.create as jest.Mock).mockImplementation(() => {
            throw new Error();
        });

        const app = createExpressInstance((req: UserRequest, res: Response, next: NextFunction) => {
            req.user = {
                id: 1,
                name: 'teste',
            };

            createTweet(req, res);
        });

        const response = await request(app)
            .post('/');

        expect(prisma.tweet.create).toThrow();
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Failed to create the post.');
    });

    it("createTweet should return a 201 response if the tweet was successfully created", async () => {
        (prisma.tweet.create as jest.Mock).mockReturnValue({ message: 'Tweet successfully created' });

        const app = createExpressInstance((req: UserRequest, res: Response, next: NextFunction) => {
            req.user = {
                id: 1,
                name: 'teste',
            };
            createTweet(req, res);
        });

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Tweet successfully created');
    });
})