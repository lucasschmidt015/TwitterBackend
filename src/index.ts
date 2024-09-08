import express, { Request, Response, NextFunction } from 'express';
import userRoutes from './routes/userRoutes';
import tweetRoutes from './routes/tweetRoutes';
import authRoutes from './routes/authRoutes';
import { authenticateToken } from './middlewares/authMiddleware';
const cors = require('cors')

const app = express();

//To inprove this project, we could add error validation in a more advanced way

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/tweet', authenticateToken, tweetRoutes);

app.get('/', (req, res) => {
    res.send("Hello World");
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({
        message: 'Internal server error',
        error: error.message || 'Something went wrong',
    });
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server ready at localhost:3000");
});
