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
        /** Đơn vị tính (VD: Cái, Bộ) — hiển thị trên hóa đơn */
        unit: { type: String, default: 'Cái', trim: true, maxlength: 32 },
        usageDevice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UsageDevice',
            default: null,
        }, // Thiết bị sử dụng
        capacity: { type: String, default: '' },
        /** Kiểu ắc quy: khô (MF/AGM…) hoặc nước (nước cất / flooded) */
        batteryType: {
            type: String,
            default: null,
            validate: {
                validator: (v) => v == null || v === '' || v === 'dry' || v === 'wet',
                message: 'batteryType phải dry, wet hoặc rỗng',
            },
        },
        /** Kích thước từng cạnh (mm) */
        dimensionLengthMm: { type: Number, default: null, min: 0 },
        dimensionWidthMm: { type: Number, default: null, min: 0 },
        dimensionHeightMm: { type: Number, default: null, min: 0 },
        weightKg: { type: Number, default: null, min: 0 },
        voltageV: { type: Number, default: null, min: 0 },
        /** Tên quốc gia (tiếng Việt) — chọn từ danh sách có tìm kiếm */
        originCountry: { type: String, default: '', trim: true, maxlength: 120 },
        costPrice: { type: Number, default: 0 },
        price: { type: Number, default: 0 },
        /**
         * % VAT áp dụng cho mặt hàng (0–100). null/undefined = dùng mặc định ở Hồ sơ cửa hàng.
         */
        vatPercent: {
            type: Number,
            min: 0,
            max: 100,
        },
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
