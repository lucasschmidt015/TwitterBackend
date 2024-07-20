import { PrismaClient } from '@prisma/client';
import { validateEmailFormat } from "../utils";
import { loginValidation } from "../validations/authValidation";
import { validadeNewUser } from "../validations/userValidation";

jest.mock('../utils', () => ({
    validateEmailFormat: jest.fn()
}));

jest.mock('@prisma/client', () => {
    const mPrismaClient = {
        user: {
            findUnique: jest.fn()
        }
    };
    return {
        PrismaClient: jest.fn(() => mPrismaClient)
    };
});

const prisma = new PrismaClient();

describe("Validation middlewares", () => {
    
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("loginValidation should return a custom error object if the e-mail was not provided", async () => {
        const res = await loginValidation({email: undefined});

        expect(res).toHaveProperty('statusCode', 400);
        expect(res.error).toBe('Please, type your E-mail');
    });

    it("loginValidation shouls return a custom error object if the e-mail is invalid", async () => {
        (validateEmailFormat as jest.Mock).mockReturnValue(false);

        const res = await loginValidation({email: 'test@test.com'});

        expect(res).toHaveProperty('statusCode', 400);
        expect(res.error).toBe('The email address you entered is invalid.');
    });

    it("loginValidation should return a custom error object if no user is found with the provided email", async () => {
        (validateEmailFormat as jest.Mock).mockReturnValue(true);
        (prisma.user.findUnique as jest.Mock).mockReturnValue(false)

        const res = await loginValidation({email: 'test@teste.com'});

        expect(res).toHaveProperty('statusCode', 401);
        expect(res.error).toBe('No user found with the e-mail provided;');
    });

    it("userValidation should return a custom error if the name is not provided", async () => {
        const newUser = { name: '', username: '', email: '' };

        const res = await validadeNewUser(newUser);

        expect(res).toHaveProperty('statusCode', 401);
        expect(res.error).toBe('You need to provide a name');
    });

    it("userValidation should return a custom error if the username is not provided", async () => {
        const newUser = { name: 'test', username: '', email: '' };

        const res = await validadeNewUser(newUser);

        expect(res).toHaveProperty('statusCode', 401);
        expect(res.error).toBe('You need to provide a username');
    });

    it("userValidation shouls return a custom error object if the e-mail is invalid", async () => {
        const newUser = { name: 'test', username: 'test', email: 'test' };

        (validateEmailFormat as jest.Mock).mockReturnValue(false);

        const res = await validadeNewUser(newUser);

        expect(res).toHaveProperty('statusCode', 401);
        expect(res.error).toBe('The email address you entered is invalid.');
    });

    it("userValidation should return a custom error object if no user is found with the provided email", async () => {
        const newUser = { name: 'test', username: 'test', email: 'test' };

        (validateEmailFormat as jest.Mock).mockReturnValue(true);
        (prisma.user.findUnique as jest.Mock).mockReturnValue(true);

        const res = await validadeNewUser(newUser);

        expect(res).toHaveProperty('statusCode', 409);
        expect(res.error).toBe('The email address provided is already associated with an existing account.');
    });

    it("userValidation shoild return undefined if all the user information is correct", async () => {
        const newUser = { name: 'test', username: 'test', email: 'test' };

        (validateEmailFormat as jest.Mock).mockReturnValue(true);
        (prisma.user.findUnique as jest.Mock).mockReturnValue(false);

        const res = await validadeNewUser(newUser);

        expect(res).toBeUndefined();
    });
})