import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        brand: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
            default: null,
        },
        sku: { type: String, required: true, trim: true },
        barcode: { type: String, default: '' },
        name: { type: String, required: true, trim: true },
        capacity: { type: String, default: '' },
        costPrice: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 0 },
        image: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
        warrantyText: { type: String, default: '' },
        warrantyMonths: { type: Number, default: null },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text' });

const Product = mongoose.model('Product', productSchema);

export default Product;
