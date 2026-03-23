/**
 * Migration: Order status từ confirmed/paid → completed
 * Chạy: node src/scripts/migrate-order-status.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../models/Order.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/acquy-thanhtu';

async function migrate() {
    try {
        await mongoose.connect(MONGODB_URI);
        const result = await Order.updateMany(
            { status: { $in: ['confirmed', 'paid'] } },
            { $set: { status: 'completed' } }
        );
        console.log(`Đã cập nhật ${result.modifiedCount} đơn hàng: confirmed/paid → completed`);
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

migrate();
