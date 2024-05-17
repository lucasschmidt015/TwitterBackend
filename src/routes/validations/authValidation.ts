type authValidationReturn = {
    error: string;
    statusCode: number;
};


export const authValidation = (body: { email: string }): authValidationReturn | undefined => {

    const { email } = body;

    if (!email) {
        return { 
            error: 'Please, type your E-mail', 
            statusCode: 400 
        };
    }

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!regex.test(email)) {
        return {
            error: 'The email address you entered is invalid.',
            statusCode: 400,
        };
    }

    return;
}