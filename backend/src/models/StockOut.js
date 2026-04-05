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
        status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
        confirmedAt: { type: Date, default: null },
        /** sale_order: xuất theo đơn bán hàng; other: xuất điều chỉnh / hủy hàng / nội bộ… */
        reasonType: { type: String, enum: ['sale_order', 'other'], default: 'other' },
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
stockOutSchema.index({ order: 1 }, { unique: true, sparse: true });

const StockOut = mongoose.model('StockOut', stockOutSchema);

export default StockOut;
