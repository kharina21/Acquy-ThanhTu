import mongoose from 'mongoose';

const stockReturnItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        reason: { type: String, default: '' },
        /** Optional: trả theo seri/IMEI (mỗi dòng 1 seri). */
        serials: { type: [String], default: [] },
    },
    { _id: true }
);

const stockReturnSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        stockIn: { type: mongoose.Schema.Types.ObjectId, ref: 'StockIn', required: true },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, default: '' },
        items: [stockReturnItemSchema],
    },
    { timestamps: true }
);

stockReturnSchema.index({ createdAt: -1 });
stockReturnSchema.index({ stockIn: 1 });
stockReturnSchema.index({ location: 1 });

const StockReturn = mongoose.model('StockReturn', stockReturnSchema);

export default StockReturn;
