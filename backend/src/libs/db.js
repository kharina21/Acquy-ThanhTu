import mongoose from 'mongoose';
import 'dotenv/config';
import Customer from '../models/Customer.js';
import StockOut from '../models/StockOut.js';

const connectDB = async () => {
    try {
        await mongoose
            .connect(process.env.MONGO_URI)
            .then(() => console.log('✅ MongoDB connected'));

        // Đảm bảo có Customer "Khách vãng lai" mặc định
        const count = await Customer.countDocuments({ type: 'walkin' });
        if (count === 0) {
            await Customer.create({ name: 'Khách vãng lai', phone: '', type: 'walkin' });
            console.log('✅ Customer "Khách vãng lai" đã được tạo');
        }

        await StockOut.syncIndexes();
    } catch (error) {
        console.error('❌MongoDB connection error:', error);
        process.exit(1);
    }
};

export default connectDB;
