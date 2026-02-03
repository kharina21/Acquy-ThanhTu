import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './libs/db.js';

//routes
import authRoutes from './routes/authRoute.js';
import activityLogRoutes from './routes/activityLogRoute.js';
import userRoutes from './routes/userRoute.js';
import productRoutes from './routes/productRoute.js';
import stockCheckRoutes from './routes/stockCheckRoute.js';
import categoryRoutes from './routes/categoryRoute.js';
import brandRoutes from './routes/brandRoute.js';
import locationRoutes from './routes/locationRoute.js';
import productStockRoutes from './routes/productStockRoute.js';

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
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-checks', stockCheckRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/product-stocks', productStockRoutes);

connectDB().then(() =>
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}🎉`);
    })
);
