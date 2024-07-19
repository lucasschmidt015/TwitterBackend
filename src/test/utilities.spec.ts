import { generateEmailToken, generateAuthToken, saveEmailToken, saveDBTokens, validateEmailFormat } from '../utils';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { sendEmailToken } from '../services/emailService';

jest.mock('@prisma/client', () => {
    const mPrismaClient = {
        token: {
            create: jest.fn()
        }
    };
    return {
        PrismaClient: jest.fn(() => mPrismaClient)
    };
});

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn()
}));

jest.mock('../services/emailService', () => ({
    sendEmailToken: jest.fn()
}));

const prisma = new PrismaClient();

describe('Utils functions', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test('generateEmailToken should return an 8 digit string', () => {
        const token = generateEmailToken();
        expect(token).toHaveLength(8);
        expect(Number(token)).toBeGreaterThanOrEqual(10000000);
        expect(Number(token)).toBeLessThanOrEqual(99999999);
    });

    test('generateAuthToken should return a JWT token', () => {
        const tokenId = 123;
        (jwt.sign as jest.Mock).mockReturnValue('test_jwt_token');
        
        const token = generateAuthToken(tokenId);

        expect(token).toBe('test_jwt_token');
        expect(jwt.sign).toHaveBeenCalledWith({ tokenId }, expect.any(String), {
            algorithm: "HS256",
            noTimestamp: true,
        });
    });

    test('saveEmailToken should create an email token and send it', async () => {
        const email = 'test@example.com';
        (prisma.token.create as jest.Mock).mockResolvedValue({ emailToken: '12345678' });
        
        await saveEmailToken(email);
        
        expect(prisma.token.create).toHaveBeenCalled();
        expect(sendEmailToken).toHaveBeenCalledWith(email, expect.any(String));
    });

    test('saveDBTokens should create access and refresh tokens', async () => {
        const email = 'test@example.com';
        (prisma.token.create as jest.Mock).mockResolvedValue({});

        const tokens = await saveDBTokens(email);

        expect(prisma.token.create).toHaveBeenCalledTimes(2);
        expect(tokens).toHaveProperty('dbAccessToken');
        expect(tokens).toHaveProperty('dbRefreshToken');
    });

    test('validateEmailFormat should return true for valid email', () => {
        const validEmail = 'test@example.com';
        expect(validateEmailFormat(validEmail)).toBe(true);
    });''

    test('validateEmailFormat should return false for invalid email', () => {
        const invalidEmail = 'invalid-email';
        expect(validateEmailFormat(invalidEmail)).toBe(false);
    });
});
