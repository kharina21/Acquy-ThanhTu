import mongoose from 'mongoose';

/**
 * PaymentLink – Ánh xạ PayOS orderCode ↔ Order.
 * Khi tạo link thanh toán lưu record; webhook dùng orderCode để tìm Order và cập nhật.
 */
const paymentLinkSchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
        orderCode: { type: Number, required: true, unique: true }, // PayOS orderCode
        paymentLinkId: { type: String, default: '' },
        status: { type: String, enum: ['pending', 'paid', 'cancelled', 'failed'], default: 'pending' },
    },
    { timestamps: true }
);

paymentLinkSchema.index({ orderCode: 1 });
paymentLinkSchema.index({ order: 1 });

const PaymentLink = mongoose.model('PaymentLink', paymentLinkSchema);
export default PaymentLink;
