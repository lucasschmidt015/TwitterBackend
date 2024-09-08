import { ValidationReturn } from "../../types";
import { validateEmailFormat } from "../utils";
import prisma from "../utils/prisma";

export const loginValidation = async (body: { email: string }): Promise<ValidationReturn | undefined> => {

    const { email } = body;

    if (!email) {
        return { 
            error: 'Please, type your E-mail', 
            statusCode: 400 
        };
    }

    if (!validateEmailFormat(email)) {
        return {
            error: 'The email address you entered is invalid.',
            statusCode: 400,
        };
    }

    const userDoesNotExists = await prisma.user.findUnique({
        where: {
            email,
        }
    })

    if (!userDoesNotExists) {
        return {
            error: 'No user found with the e-mail provided;',
            statusCode: 401,
        }
    }

    return;
}
