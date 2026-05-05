import mongoose from 'mongoose';

const stockCheckItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantityBefore: { type: Number, required: true, default: 0 },
        quantityCounted: { type: Number, required: true, default: 0 },
        quantityChange: { type: Number, required: true, default: 0 }, // quantityCounted - quantityBefore
        unitPrice: { type: Number, default: 0 }, // giá để tính giá trị (costPrice hoặc price)
        valueChange: { type: Number, default: 0 }, // quantityChange * unitPrice
        /** Ghi chú tình trạng hàng khi kiểm (vỏ, date, hư hỏng nhẹ, …) */
        conditionNote: { type: String, default: '' },
    },
    { _id: true }
);

const stockCheckSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, default: '' },
        /** Ngày trên phiếu kiểm kho (YYYY-MM-DD); có thể khác ngày nhập hệ thống — phục vụ nhập chứng từ cũ */
        documentDate: { type: String, default: null, trim: true },
        status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
        confirmedAt: { type: Date, default: null },
        items: [stockCheckItemSchema],
    },
    { timestamps: true }
);

stockCheckSchema.index({ createdAt: -1 });
stockCheckSchema.index({ documentDate: -1 });
stockCheckSchema.index({ createdBy: 1 });
stockCheckSchema.index({ location: 1 });

const StockCheck = mongoose.model('StockCheck', stockCheckSchema);

export default StockCheck;
