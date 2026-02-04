import mongoose from 'mongoose';

/**
 * Sản phẩm (chỉ thông tin hàng hóa). Tồn kho match ở bảng ProductStock (product + location + quantity).
 */
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
        usageDevice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UsageDevice',
            default: null,
        }, // Thiết bị sử dụng
        capacity: { type: String, default: '' },
        costPrice: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        image: { type: String, default: '' },
        images: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
        warrantyText: { type: String, default: '' },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ isDeleted: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
