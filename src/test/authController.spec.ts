import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { authenticateEmailToken, handleLogout, handleRefreshToken, startLogin } from "../controllers/authController";
import { generateAuthToken, saveDBTokens, saveEmailToken } from "../utils";
import { loginValidation } from "../validations/authValidation";
import { createExpressInstance } from "./utilities";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'SuperSecret';

jest.mock('../utils', () => ({
    saveEmailToken: jest.fn(),
    generateAuthToken: jest.fn(),
    saveDBTokens: jest.fn()
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

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

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

    it("handleRefreshToken should return a custom error response if the input is invalid", async () => {
        const requestBody = {
            accessToken: undefined,
            refreshToken: undefined,
        };

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('stillValid', false);
    });

    it("handleRefreshToken should return a custom error response if the acessToken payload doesn't include an tokenId", async () => {
        const requestBody = {
            accessToken: 'sometoken',
            refreshToken: 'sometoken',
        };

        (jwt.verify as jest.Mock).mockReturnValue({ tokenId: false });

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('stillValid', false);
    });

    //<-----------------------------
    it("handleRefreshToken should return 401 if refreshToken payload doesn't include tokenId", async () => {
        const requestBody = {
            accessToken: 'expiredAccessToken',
            refreshToken: 'invalidRefreshToken'
        };

        (jwt.verify as jest.Mock).mockImplementation((token) => {
            if (token === 'expiredAccessToken') return { tokenId: 1 };
            if (token === 'invalidRefreshToken') return {};
        });

        (prisma.token.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            valid: false,
            expiration: new Date(Date.now() - 1000),
            user: { email: 'user@example.com' }
        });

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('stillValid', false);
    });

    it("handleRefreshToken should return 200 with stillValid false if oldDBRefreshToken is invalid or expired", async () => {
        const requestBody = {
            accessToken: 'expiredAccessToken',
            refreshToken: 'validRefreshToken'
        };

        (jwt.verify as jest.Mock).mockImplementation((token) => {
            if (token === 'expiredAccessToken') return { tokenId: 1 };
            if (token === 'validRefreshToken') return { tokenId: 2 };
        });

        (prisma.token.findUnique as jest.Mock)
            .mockResolvedValueOnce({
                id: 1,
                valid: false,
                expiration: new Date(Date.now() - 1000),
                user: { email: 'user@example.com' }
            })
            .mockResolvedValueOnce({
                id: 2,
                valid: false,
                expiration: new Date(Date.now() - 1000),
                user: { email: 'user@example.com' }
            });

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('stillValid', false);
    });

    it("handleRefreshToken should return 200 with new tokens if refreshToken is valid", async () => {
        const requestBody = {
            accessToken: 'expiredAccessToken',
            refreshToken: 'validRefreshToken'
        };

        (jwt.verify as jest.Mock).mockImplementation((token) => {
            if (token === 'expiredAccessToken') return { tokenId: 1 };
            if (token === 'validRefreshToken') return { tokenId: 2 };
        });

        (prisma.token.findUnique as jest.Mock)
            .mockResolvedValueOnce({
                id: 1,
                valid: false,
                expiration: new Date(Date.now() - 1000),
                user: { email: 'user@example.com' }
            })
            .mockResolvedValueOnce({
                id: 2,
                valid: true,
                expiration: new Date(Date.now() + 1000),
                user: { email: 'user@example.com' }
            });

        (saveDBTokens as jest.Mock).mockResolvedValue({
            dbAccessToken: { id: 3 },
            dbRefreshToken: { id: 4 }
        });

        (generateAuthToken as jest.Mock)
            .mockReturnValueOnce('newAccessToken')
            .mockReturnValueOnce('newRefreshToken');

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('stillValid', false);
        expect(response.body.UpdatedTokens).toEqual({
            accessToken: 'newAccessToken',
            refreshToken: 'newRefreshToken'
        });
    });

    it("handleRefreshToken should return 200 with stillValid true if accessToken is valid", async () => {
        const requestBody = {
            accessToken: 'validAccessToken',
            refreshToken: 'validRefreshToken'
        };

        (jwt.verify as jest.Mock).mockReturnValue({ tokenId: 1 });

        (prisma.token.findUnique as jest.Mock).mockResolvedValue({
            id: 1,
            valid: true,
            expiration: new Date(Date.now() + 1000),
            user: { email: 'user@example.com' }
        });

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('stillValid', true);
    });

    it("handleRefreshToken should return 401 on any other error", async () => {
        const requestBody = {
            accessToken: 'anyAccessToken',
            refreshToken: 'anyRefreshToken'
        };

        (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error(); });

        const app = createExpressInstance(handleRefreshToken);

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(401);
    });

    it('handleLogout should return a 200 status code if the accessToken and refreshToken were not provided', async () => {
        const requestBody = { 
            accessToken: undefined,
            refreshToken: undefined,
        };

        const app = createExpressInstance(handleLogout)

        const response = await request(app)
            .post('/')
            .send(requestBody);

        expect(response.status).toBe(200);
    });
});

