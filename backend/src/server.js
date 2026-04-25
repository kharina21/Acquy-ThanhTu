import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './libs/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
import stockOutRoutes from './routes/stockOutRoute.js';
import inventoryReportRoutes from './routes/inventoryReportRoute.js';
import stockReturnRoutes from './routes/stockReturnRoute.js';
import bankAccountRoutes from './routes/bankAccountRoute.js';
import cartRoutes from './routes/cartRoute.js';
import batteryTradeInRoutes from './routes/batteryTradeInRoute.js';
import orderRoutes from './routes/orderRoute.js';
import warrantyRoutes from './routes/warrantyRoute.js';
import customerRoutes from './routes/customerRoute.js';
import paymentRoutes from './routes/paymentRoute.js';
import dashboardRoutes from './routes/dashboardRoute.js';
import shippingAddressRoutes from './routes/shippingAddressRoute.js';
import vietqrBanksRoute from './routes/vietqrBanksRoute.js';

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/vietqr-banks', vietqrBanksRoute);
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
app.use('/api/stock-outs', stockOutRoutes);
app.use('/api/inventory-reports', inventoryReportRoutes);
app.use('/api/stock-returns', stockReturnRoutes);
app.use('/api/bank-accounts', bankAccountRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/battery-trade-in', batteryTradeInRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warranties', warrantyRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shipping-addresses', shippingAddressRoutes);

// Serve React build (production)
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ message: 'Not found' });
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}

connectDB().then(() =>
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}🎉`);
    }),
);
