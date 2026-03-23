import mongoose from 'mongoose';

/**
 * Yêu cầu thu cũ acquy - Guest và Customer đều có thể gửi.
 */
const batteryTradeInSchema = new mongoose.Schema(
    {
        // Thông tin người dùng
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true },
        address: { type: String, default: '' },
        note: { type: String, default: '' },

        // Liên kết user (nếu đã đăng nhập)
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

        // Thông tin acquy
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
        batteryName: { type: String, default: '' },
        images: { type: [String], default: [] },
        quantity: { type: Number, default: 1 },
        manufacturingDate: { type: Date },
        expiryDate: { type: Date },
        condition: { type: String, default: '' },
        usageDuration: { type: String, default: '' },
        isWorkingWell: { type: Boolean },
        pricingType: { type: String, enum: ['ampe', 'weight'], default: 'ampe' },
        remainingAmps: { type: String, default: '' },
        weightKg: { type: String, default: '' },

        status: {
            type: String,
            enum: ['pending', 'contacted', 'completed', 'cancelled'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

batteryTradeInSchema.index({ status: 1 });
batteryTradeInSchema.index({ createdAt: -1 });

const BatteryTradeIn = mongoose.model('BatteryTradeIn', batteryTradeInSchema);

export default BatteryTradeIn;
