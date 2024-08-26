import express, { Request, Response, NextFunction } from 'express'

export function createExpressInstance(callback) {
    
    const app = express();

    app.use(express.json());

    app.use((req: Request, res: Response, next: NextFunction) => {
        callback(req, res, next);
    });

    return app;
}