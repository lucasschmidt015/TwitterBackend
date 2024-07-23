import { PrismaClient } from "@prisma/client";
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { startLogin, authenticateEmailToken, handleRefreshToken } from "../controllers/authController";
import { saveEmailToken } from "../utils";
import { loginValidation } from "../validations/authValidation";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'SuperSecret';

jest.mock('../utils', () => ({
    saveEmailToken: jest.fn()
}));

jest.mock('../validations/authValidation', () => ({
    loginValidation: jest.fn()
}));

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        token: {
            findUnique: jest.fn()
        }
    }

    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    }
});

function createExpressInstance(callback) {
    const app = express();
    app.use(express.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
        callback(req, res, next);
    })

    return app;
}

describe('Auth Controller', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    
    it("startLogin should return a custom error response if the email provided is invalid", async () => {
        (loginValidation as jest.Mock).mockReturnValue({ statusCode: 500, error: 'An error message' });

        const app = createExpressInstance(startLogin);

        const response = await request(app).get('/')

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'An error message');
    });

    it('startLogin should return a custom error response if saveEmailToken throws an error', async () => {
        (loginValidation as jest.Mock).mockReturnValue(null);
        (saveEmailToken as jest.Mock).mockImplementation(() => {
            throw new Error('A test error');
        })

        const app = createExpressInstance(startLogin);

        const response = await request(app).get('/')

        expect(saveEmailToken).toHaveBeenCalled();
        expect(response.status).toBe(500)
        expect(response.body).toHaveProperty('error', 'Internal server error, please try again later.');
    });

    it("startLogin should return an success response", async () => {
        (loginValidation as jest.Mock).mockReturnValue(null);
        (saveEmailToken as jest.Mock).mockReturnValue(true);

        const app = createExpressInstance(startLogin);

        const response = await request(app).get('/');

        expect(saveEmailToken).toHaveBeenCalled();
        expect(response.status).toBe(200);
    });

    it("authenticateEmailToken should return a custom error response if the email was not provided", async () => {
        const requestBody = {
            email: undefined,
            emailToken: undefined,
        };

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app).post('/').send(requestBody);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'The email field was not provided');
    })

    it("authenticateEmailToken should return a custom response if the emailToken was not provided", async () => {
        const requestBody = {
            email: 'test@test.com',
            emailToken: undefined
        };

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app).post('/').send(requestBody);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'The token field was not provided');
    });

    it("authenticateEmailToken should return a custom response if the dbEmailToken was not found", async () => {
        const requestBody = {
            email: 'teste@teste.com',
            emailToken: '123123142',
        };

        (prisma.token.findUnique as jest.Mock).mockReturnValue(false);

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'The password is invalid')

    });

    it('authenticateEmailToken should return a custom error response if the dbEmailToken is not longer valid', async () => {
        const requestBody = {
            email: 'teste@teste.com',
            emailToken: '123123123',
        };

        (prisma.token.findUnique as jest.Mock).mockReturnValue({ valid: false });

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401)
        expect(response.body).toHaveProperty('error', 'The password is invalid');
    });

    it("authenticateEmailToken should return a custom error response if the token has expired", async () => {
        const requestBody = {
            email: 'teste@teste.com',
            emailToken: '123123123',
        };

        (prisma.token.findUnique as jest.Mock).mockReturnValue({ valid: true, expiration: new Date(Date.now() - 86400000) });

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'The password has expired');
    });

    it("authenticateEmailToken should return a custom error response if the email of the user in the token doesn't match the email sent", async () => {
        const requestBody = {
            email: 'teste@teste.com',
            emailToken: '123123123',
        };

        (prisma.token.findUnique as jest.Mock).mockReturnValue({ valid: true, expiration: new Date(Date.now() + 86400000), user: { email: 'teste2@test.com' } });

        const app = createExpressInstance(authenticateEmailToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'unauthorized');
    });
    
});

