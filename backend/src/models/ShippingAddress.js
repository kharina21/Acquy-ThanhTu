import mongoose from 'mongoose';

/**
 * Địa chỉ giao hàng đã lưu của người dùng (mỗi user nhiều bản ghi, một mặc định).
 */
const shippingAddressSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        label: {
            type: String,
            default: '',
            trim: true,
            maxlength: 80,
        },
        recipientName: {
            type: String,
            required: true,
            trim: true,
        },
        shippingPhone: {
            type: String,
            required: true,
            trim: true,
        },
        provinceCode: { type: String, required: true, trim: true },
        provinceName: { type: String, required: true, trim: true },
        districtCode: { type: String, required: true, trim: true },
        districtName: { type: String, required: true, trim: true },
        wardCode: { type: String, required: true, trim: true },
        wardName: { type: String, required: true, trim: true },
        addressLine: { type: String, required: true, trim: true },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

shippingAddressSchema.index({ userId: 1 });
shippingAddressSchema.index({ userId: 1, isDefault: 1 });

const ShippingAddress = mongoose.model('ShippingAddress', shippingAddressSchema);

export default ShippingAddress;
