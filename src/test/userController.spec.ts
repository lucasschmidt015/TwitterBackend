import { PrismaClient } from "@prisma/client";
import { createExpressInstance } from "./utilities";
import request from 'supertest';
import { Request, Response, NextFunction } from 'express'
import { createUser } from "../controllers/userController";
import { validadeNewUser } from "../validations/userValidation";
import { saveEmailToken } from "../utils";

const prisma = new PrismaClient();

jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        user: {
            create: jest.fn(),
            // update: jest.fn(),
            // findMany: jest.fn(),
            // findUnique: jest.fn(),
            // delete: jest.fn(),
        }
    }

    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    }
});

jest.mock('../validations/userValidation', () => ({
    validadeNewUser: jest.fn(),
}));

jest.mock('../utils', () => ({
    saveEmailToken: jest.fn(),
}));

describe("User controller", () => {

    afterEach(() => {
        jest.clearAllMocks();
    });


    it('createUser should return a custom error reponse if the input validation fails.', async () => {
        (validadeNewUser as jest.Mock).mockReturnValue({statusCode: 400, error: 'something went wrong'});

        const app = createExpressInstance(createUser);

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'something went wrong');
    });

    it("createUser should return a custom error response if the creation throws an error", async () => {
        (validadeNewUser as jest.Mock).mockReturnValue(null);

        (prisma.user.create as jest.Mock).mockImplementation(() => {
            throw new Error('Some error');
        });

        const app = createExpressInstance(createUser);

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Username and email should be unique.');
    });

    it("createUser should return a success response if the creation succed", async () => {
        (validadeNewUser as jest.Mock).mockReturnValue(null);
        (prisma.user.create as jest.Mock).mockReturnValue({
            id: 1,
            name: 'fake user'
        });
        (saveEmailToken as jest.Mock).mockReturnValue(null);

        const app = createExpressInstance(createUser);

        const response = await request(app)
            .post('/');

        expect(response.status).toBe(201);
        expect(saveEmailToken).toHaveBeenCalled();
        expect(response.body).toHaveProperty('name', 'fake user');
        
    });
})