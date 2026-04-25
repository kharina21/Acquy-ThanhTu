import mongoose from 'mongoose';

/**
 * Order – Đơn hàng online. createdBy = null nghĩa là "Bán trên web".
 * Tồn kho lấy từ ProductStock tại location (kho tổng).
 */
const orderItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        /** Đơn giá chưa thuế GTGT (theo sản phẩm) */
        price: { type: Number, required: true },
        /** Thành tiền dòng = tiền hàng (chưa thuế) + thuế GTGT dòng (làm tròn) */
        total: { type: Number, required: true },
        /** % VAT áp dụng dòng (snapshot) */
        vatPercent: { type: Number, min: 0, max: 100 },
        /** Tiền thuế GTGT dòng (làm tròn) */
        vatAmount: { type: Number, min: 0, default: 0 },
        /** Snapshot ĐVT khi tạo đơn (theo sản phẩm) */
        unit: { type: String, default: 'Cái', trim: true, maxlength: 32 },
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
        /**
         * Online: pending → (thanh toán) → seller confirmed → kho xuất → completed.
         * in_store: đặt trước = pending; bán thường = confirmed chờ kho xuất (hoặc pending khi chưa thanh toán chuyển khoản) → completed.
         */
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
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
        /** Mã BIN ngân hàng (VietQR) khi hoàn tiền */
        refundBankBin: { type: String, default: '' },
        refundBankAccount: { type: String, default: '' },
        refundAccountHolder: { type: String, default: '' },
        /** Khách đặt hàng tại cửa hàng nhưng hàng chưa có sẵn */
        isPreOrder: { type: Boolean, default: false },
        /**
         * Online & bán tại quầy (khi tạo hóa đơn thường): true = đã giữ chỗ tồn (reservedOnlineQty), chưa trừ quantity.
         * false/undefined = không còn giữ chỗ (đã xuất kho, đơn cũ, hoặc đặt cọc).
         */
        warehouseReservationActive: { type: Boolean },
        /** Xuất kho nhanh: chỉ số dòng trong items (0-based) đã quét đóng gói — đủ mới cho xác nhận xuất kho */
        warehousePackedLineIndexes: { type: [Number], default: [] },
        /** Nhân viên kho xác nhận đã gom/kiểm hàng sẵn sàng trước bước quét từng dòng (bắt buộc theo nghiệp vụ) */
        warehouseItemsPreparedAt: { type: Date, default: null },
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
