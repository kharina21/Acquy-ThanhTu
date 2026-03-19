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
import orderRoutes from './routes/orderRoute.js';
import customerRoutes from './routes/customerRoute.js';
import paymentRoutes from './routes/paymentRoute.js';

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

app.use('/api/auth', authRoutes); // Xác thực (đăng nhập, đăng ký, ...)
app.use('/api/activity-logs', activityLogRoutes); // Nhật ký hoạt động
app.use('/api/users', userRoutes); // Quản lý người dùng
app.use('/api/products', productRoutes); // Quản lý sản phẩm
app.use('/api/stock-checks', stockCheckRoutes); // Kiểm kho
app.use('/api/categories', categoryRoutes); // Loại hàng
app.use('/api/brands', brandRoutes); // Thương hiệu
app.use('/api/locations', locationRoutes); // Chi nhánh
app.use('/api/product-stocks', productStockRoutes); // Tồn kho theo chi nhánh
app.use('/api/usage-devices', usageDeviceRoutes); // Thiết bị sử dụng
app.use('/api/roles', roleRoutes); // Vai trò
app.use('/api/employees', employeeRoutes); // Nhân viên
app.use('/api/member-policies', memberPolicyRoutes); // Chính sách khách hàng
app.use('/api/suppliers', supplierRoutes); // Nhà cung cấp
app.use('/api/stock-ins', stockInRoutes); // Nhập hàng
app.use('/api/stock-returns', stockReturnRoutes); // Trả hàng
app.use('/api/bank-accounts', bankAccountRoutes); // Tài khoản ngân hàng (VietQR)
app.use('/api/cart', cartRoutes); // Giỏ hàng
app.use('/api/orders', orderRoutes); // Đơn hàng
app.use('/api/customers', customerRoutes); // Khách hàng
app.use('/api/payments', paymentRoutes); // Webhook PayOS

connectDB().then(() =>
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}🎉`);
    }),
);
