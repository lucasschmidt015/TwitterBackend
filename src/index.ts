import express from 'express';
import userRoutes from './routes/userRoutes';
import tweetRoutes from './routes/tweetRoutes';
import authRoutes from './routes/authRoutes';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/user', userRoutes);
app.use('/tweet', tweetRoutes);

app.get('/', (req, res) => {
    res.send("Hello World");
});


app.listen(3000, () => {
    console.log("Server ready at localhost:3000");
});

// I've stoped at 2:55:17 <------------