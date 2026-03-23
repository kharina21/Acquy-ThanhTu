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
import usageDeviceRoutes from './routes/usageDeviceRoute.js';
import productStockRoutes from './routes/productStockRoute.js';
import roleRoutes from './routes/roleRoute.js';
import employeeRoutes from './routes/employeeRoute.js';
import memberPolicyRoutes from './routes/memberPolicyRoute.js';
import supplierRoutes from './routes/supplierRoute.js';
import stockInRoutes from './routes/stockInRoute.js';
import stockReturnRoutes from './routes/stockReturnRoute.js';
import bankAccountRoutes from './routes/bankAccountRoute.js';
import cartRoutes from './routes/cartRoute.js';
import batteryTradeInRoutes from './routes/batteryTradeInRoute.js';
import orderRoutes from './routes/orderRoute.js';
import customerRoutes from './routes/customerRoute.js';
import paymentRoutes from './routes/paymentRoute.js';
import dashboardRoutes from './routes/dashboardRoute.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true,
    }),
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
app.use('/api/usage-devices', usageDeviceRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/member-policies', memberPolicyRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/stock-ins', stockInRoutes);
app.use('/api/stock-returns', stockReturnRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/battery-trade-in', batteryTradeInRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

connectDB().then(() =>
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}🎉`);
    }),
);
