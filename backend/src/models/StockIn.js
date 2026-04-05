import mongoose from 'mongoose';

const stockInItemSchema = new mongoose.Schema(
    {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 }, // quantity * unitPrice
    },
    { _id: true }
);

const stockInSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, trim: true },
        supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
        location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        note: { type: String, default: '' },
        status: { type: String, enum: ['draft', 'confirmed'], default: 'draft' },
        confirmedAt: { type: Date, default: null },
        items: [stockInItemSchema],
        totalAmount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

stockInSchema.index({ createdAt: -1 });
stockInSchema.index({ location: 1 });
stockInSchema.index({ supplier: 1 });

const StockIn = mongoose.model('StockIn', stockInSchema);

export default StockIn;
