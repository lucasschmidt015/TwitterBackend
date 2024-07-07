import { ValidationReturn } from "../../types";
import { validateEmailFormat } from "../utils";
import { PrismaClient } from "@prisma/client";

type newUser = {
    email: string;
    username: string;
    name: string;
}

const prisma = new PrismaClient();

export const validadeNewUser = async (body: newUser): Promise<ValidationReturn | undefined>  => {
 
    const { name, username, email } = body;

    if (name.length < 1) {
        return { statusCode: 401, error: 'You need to provide a name' };
    }

    if (username.length < 1) {
        return { statusCode: 401, error: 'You need to provide a username' };
    }

    //Username should be unique <----------

    if (!validateEmailFormat(email)) {
        return {
            statusCode: 401,
            error: 'The email address you entered is invalid.'
        }
    }

    const userAlreadyExists = await prisma.user.findUnique({
        where: {
            email
        }
    });
    
    if (userAlreadyExists) {
        return {
            statusCode: 409,
            error: 'The email address provided is already associated with an existing account.',
        }
    }

    return;
}