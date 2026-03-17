import mongoose from 'mongoose';

/**
 * Order – Đơn hàng online. createdBy = null nghĩa là "Bán trên web".
 * Tồn kho lấy từ ProductStock tại location (kho tổng).
 */
const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true },
        total: { type: Number, required: true },
    },
    { _id: true }
);

const orderSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        channel: { type: String, enum: ['online', 'in_store'], default: 'online' },
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = Bán trên web
        items: [orderItemSchema],
        totalAmount: { type: Number, required: true, default: 0 },
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'paid', 'cancelled'],
            default: 'pending',
        },
        paymentMethod: {
            type: String,
            enum: ['vietqr', 'cash', 'transfer'],
            default: 'transfer',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        shippingAddress: { type: String, default: '' },
        note: { type: String, default: '' },
        vietqrTransactionId: { type: String, default: '' },
        paidAt: { type: Date, default: null },
    },
    { timestamps: true }
);

orderSchema.index({ customer: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ location: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
