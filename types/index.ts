
export type User = {
    email: string;
    name?: string;
    username?: string;
    image?: string;
    bio?: string;
}

export type ValidationReturn = {
    error: string;
    statusCode: number;
};