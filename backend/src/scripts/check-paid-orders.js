/**
 * Script kiểm tra đơn hàng đã thanh toán trong DB.
 * Chạy: node backend/src/scripts/check-paid-orders.js
 */
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/acquy-thanhtu');
    console.log('Kết nối MongoDB OK.\n');

    const paid = await Order.find({ paymentStatus: 'paid' })
        .select('code totalAmount paidAt createdAt location channel')
        .populate('location', 'code name isOnlineLocation')
        .lean();

    console.log(`Tìm thấy ${paid.length} đơn đã thanh toán (paymentStatus: paid):\n`);
    if (paid.length === 0) {
        console.log('Không có đơn nào. Kiểm tra xem đơn trong Hóa đơn có paymentStatus gì.');
        const sample = await Order.findOne().select('code paymentStatus status paidAt createdAt').lean();
        if (sample) console.log('Mẫu đơn bất kỳ:', sample);
    } else {
        const now = new Date();
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        for (const o of paid) {
            const inRange = (o.paidAt || o.createdAt) >= startMonth && (o.paidAt || o.createdAt) <= now;
            console.log(
                `- ${o.code}: ${o.totalAmount?.toLocaleString('vi-VN')}đ | paidAt: ${o.paidAt || 'null'} | createdAt: ${o.createdAt} | location: ${o.location?.code || o.location} | trong tháng: ${inRange ? 'Có' : 'Không'}`
            );
        }
        const total = paid.reduce((s, o) => s + (o.totalAmount || 0), 0);
        console.log(`\nTổng doanh thu (tất cả đơn paid): ${total.toLocaleString('vi-VN')}đ`);
    }

    await mongoose.disconnect();
    console.log('\nXong.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
