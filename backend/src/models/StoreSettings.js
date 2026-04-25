import mongoose from 'mongoose';

/**
 * Cấu hình chung cửa hàng (một bản ghi). Hiện dùng: % VAT mặc định khi sản phẩm không đặt % riêng.
 */
const storeSettingsSchema = new mongoose.Schema(
    {
        defaultVatPercent: {
            type: Number,
            default: 10,
            min: 0,
            max: 100,
        },
        /** Mã số thuế người bán (MST) — dùng trên hóa đơn */
        taxCode: { type: String, default: '', trim: true, maxlength: 20 },
    },
    { timestamps: true }
);

const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);

export default StoreSettings;
