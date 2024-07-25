import { createTweet, updateTweet, listTweets, getTweetById } from "../controllers/tweetController";
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
            create: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
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

    it("UpdateTweet should return a custom error response if the tweet update fails", async () => {
        (prisma.tweet.update as jest.Mock).mockImplementation(() => {
            throw new Error('Some error');
        });

        const app = createExpressInstance(updateTweet);

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Failed to update the tweet.');
    });

    it('updateTweet should return the updated tweet data if everything succeds', async () => {
        (prisma.tweet.update as jest.Mock).mockReturnValue({
            id: 1,
            content: 'some fake data',
        });

        const app = createExpressInstance(updateTweet);

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('content', 'some fake data');      
    });

    it('listTweets should return a list of tweets', async () => {
        (prisma.tweet.findMany as jest.Mock).mockReturnValue([
            { id: 1, content: 'some fake content 1' },
            { id: 2, content: 'some fake content 2' },
            { id: 3, content: 'some fake content 3' },
        ]);

        const app = createExpressInstance(listTweets);

        const response = await request(app)
            .post('/')
        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(3);
    })

    it('getTweetById should return a single tweet', async () => {
        (prisma.tweet.findUnique as jest.Mock).mockReturnValue({ id: 1, content: 'some fake content 1' });      

        const app = createExpressInstance(getTweetById);

        const response = await request(app)
            .post('/')
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('content', 'some fake content 1');
    })

})