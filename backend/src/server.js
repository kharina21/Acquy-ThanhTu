import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './libs/db.js';

//routes
import authRoutes from './routes/authRoute.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true,
    })
);

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

connectDB().then(() =>
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}🎉`);
    })
);
