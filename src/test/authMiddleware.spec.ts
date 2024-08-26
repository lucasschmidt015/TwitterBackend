import { PrismaClient } from '@prisma/client';
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { authenticateToken } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        token: {
            findUnique: jest.fn()
        }
    };
    return {
        PrismaClient: jest.fn(() => mockPrismaClient),
    };
});


const JWT_SECRET = process.env.JWT_SECRET || "SUPER SECRET";

const app = express();
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    authenticateToken(req, res, next);
});


describe("Authentication middleware", () => {

    let validToken: string;
    let expiredToken: string;
    let invalidToken: string;

    beforeAll(() => {
        validToken = jwt.sign({ tokenId: 1 }, JWT_SECRET, {expiresIn: '1h' })
        expiredToken = jwt.sign({ tokenId: 2 }, JWT_SECRET, {expiresIn: '-1h' })
        invalidToken = jwt.sign({ invalidField: 1 }, JWT_SECRET, {expiresIn: '1h' })
    })

    afterEach(() => {
        jest.resetAllMocks();
    })

    it("Should return a 401 if no token was provided", async () => {
        const response = await request(app).get('/');
        expect(response.status).toBe(401);
    });   

    it('Shoud return 401 with the token has expired', async () => {
        const response = await request(app)
            .get('/')
            .set('Authorization', `Bearer ${expiredToken}`)

        expect(response.status).toBe(401);
    });

    it("should return 401 if token is invalid", async () => {
        const response = await request(app)
            .get('/')
            .set('Authorization', `Bearer ${invalidToken}`);

        expect(response.status).toBe(401);
    });


    it("Should return 401 and 'API token expired' if the database token is invalid or expired", async () => {
        (prisma.token.findUnique as jest.Mock).mockResolvedValue(null);  

        const response = await request(app)
            .get('/')
            .set('Authorization', `Bearer ${validToken}`);


        expect(response.status).toBe(401)
        expect(JSON.parse(response.text)).toHaveProperty('error', 'API token expired')
    });


    it ('Should call next if token is valid', async () => {
        const mockUser = { id: 1, name: 'Romeu' };
        (prisma.token.findUnique as jest.Mock).mockResolvedValue({
            valid: true,
            expiration: new Date(Date.now() + 3600 * 1000),
            user: mockUser
          });

        let nextCalled = false;
        app.use((req: Request, res: Response) => {
            nextCalled = true;
            res.sendStatus(200);
        })

        const response = await request(app)
            .get('/')
            .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(nextCalled).toBe(true);
    })
})