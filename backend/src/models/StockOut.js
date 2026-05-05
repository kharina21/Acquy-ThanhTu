import mongoose from 'mongoose';

const stockOutItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
    },
    { _id: true }
);

const stockOutSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, default: '' },
        /** Ngày trên chứng từ / phiếu xuất (nhập tay — nhập tài liệu cũ). Không có thì hiển thị theo ngày tạo phiếu */
        documentDate: { type: Date, default: null },
        status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
        confirmedAt: { type: Date, default: null },
        /**
         * sale_order: theo đơn hàng (hệ thống);
         * adjustment | internal_use | damage_loss | supplier_return | other: phiếu nhập tay.
         */
        reasonType: {
            type: String,
            enum: ['sale_order', 'adjustment', 'internal_use', 'damage_loss', 'supplier_return', 'other'],
            default: 'other',
        },
        /**
         * Chỉ dùng khi reasonType = sale_order: online = xác nhận xuất tay từ kho;
         * offline = bán tại quầy, phiếu ghi nhận tự động khi lập đơn (đã trừ tồn).
         */
        saleChannel: { type: String, enum: ['online', 'offline'] },
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
        items: [stockOutItemSchema],
        totalAmount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

stockOutSchema.index({ createdAt: -1 });
stockOutSchema.index({ location: 1 });
stockOutSchema.index({ location: 1, saleChannel: 1 });
/** Mỗi đơn tối đa một phiếu xuất; phiếu xuất tay không có order — không dùng sparse+null vì null vẫn bị index và trùng unique. */
stockOutSchema.index(
    { order: 1 },
    { unique: true, partialFilterExpression: { order: { $type: 'objectId' } } }
);

const StockOut = mongoose.model('StockOut', stockOutSchema);

export default StockOut;
