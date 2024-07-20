import { PrismaClient } from "@prisma/client";
import express, { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { startLogin } from "../controllers/authController";
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

    it('startLogin should return an success response', async () => {
        (loginValidation as jest.Mock).mockReturnValue(null);
        (saveEmailToken as jest.Mock).mockReturnValue(true);

        const app = createExpressInstance(startLogin);

        const response = await request(app).get('/');

        expect(saveEmailToken).toHaveBeenCalled();
        expect(response.status).toBe(200);
    });
})