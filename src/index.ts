import express from 'express';
import userRoutes from './routes/userRoutes';
import tweetRoutes from './routes/tweetRoutes';
import authRoutes from './routes/authRoutes';
import { authenticateToken } from './middlewares/authMiddleware';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/user', authenticateToken, userRoutes);
app.use('/tweet', authenticateToken, tweetRoutes);

app.get('/', (req, res) => {
    res.send("Hello World");
});


app.listen(3000, () => {
    console.log("Server ready at localhost:3000");
});

// I've stoped at 3:33:00 <------------