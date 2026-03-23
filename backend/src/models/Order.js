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
        /** User đặt hàng (online) hoặc guest (in_store). Dùng cho permission. */
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        /** Khách hàng từ bảng Customer – Order luôn trỏ tới Customer (bắt buộc khi tạo mới) */
        customerProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = Bán trên web
        items: [orderItemSchema],
        totalAmount: { type: Number, required: true, default: 0 },
        /** Giảm giá (VNĐ) – từ chính sách hạng khách hàng hoặc giảm thủ công */
        discount: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ['pending', 'completed', 'cancelled'],
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
        /** Tên người nhận hàng */
        shippingRecipientName: { type: String, default: '' },
        /** Địa chỉ chi tiết – dùng khi chỉnh sửa */
        provinceCode: { type: String, default: '' },
        provinceName: { type: String, default: '' },
        districtCode: { type: String, default: '' },
        districtName: { type: String, default: '' },
        wardCode: { type: String, default: '' },
        wardName: { type: String, default: '' },
        addressLine: { type: String, default: '' },
        /** Số điện thoại nhận hàng */
        shippingPhone: { type: String, default: '' },
        note: { type: String, default: '' },
        vietqrTransactionId: { type: String, default: '' },
        paidAt: { type: Date, default: null },
        /** Thông tin hoàn tiền khi khách hủy đơn đã thanh toán */
        refundBankName: { type: String, default: '' },
        refundBankAccount: { type: String, default: '' },
        refundAccountHolder: { type: String, default: '' },
        /** Khách đặt hàng tại cửa hàng nhưng hàng chưa có sẵn */
        isPreOrder: { type: Boolean, default: false },
    },
    { timestamps: true }
);

orderSchema.index({ customer: 1 });
orderSchema.index({ customerProfile: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ location: 1 });
orderSchema.index({ isPreOrder: 1 });

const Order = mongoose.model('Order', orderSchema);

export default Order;
