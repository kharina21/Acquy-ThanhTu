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
        /** Số năm bảo hành (0-99) */
        warrantyYears: { type: Number, default: 0, min: 0, max: 99 },
        /** Số tháng bảo hành (0-11) */
        warrantyMonths: { type: Number, default: 0, min: 0, max: 11 },
        /** Text hiển thị – tự động sinh từ warrantyYears + warrantyMonths (không cần nhập tay) */
        warrantyText: { type: String, default: '' },
        notes: { type: String, default: '' },
    },
    { timestamps: true }
);

productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ isDeleted: 1 });

/** Tự động sinh warrantyText từ warrantyYears + warrantyMonths trước khi save */
productSchema.pre('save', function () {
    const y = this.warrantyYears || 0;
    const m = this.warrantyMonths || 0;

    if (y === 0 && m === 0) {
        this.warrantyText = '';
    } else if (y === 0) {
        this.warrantyText = `${m} Tháng`;
    } else if (m === 0) {
        this.warrantyText = `${y} Năm`;
    } else {
        this.warrantyText = `${y} Năm ${m} Tháng`;
    }
});

/**
 * Tính tổng số tháng bảo hành (dùng trong controller/service).
 * @param {Object} product - Product document hoặc plain object
 * @returns {number} Số tháng
 */
productSchema.statics.calcWarrantyMonths = function (product) {
    const y = product?.warrantyYears || 0;
    const m = product?.warrantyMonths || 0;
    return y * 12 + m;
};

const Product = mongoose.model('Product', productSchema);

export default Product;
