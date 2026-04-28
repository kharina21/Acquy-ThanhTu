import mongoose from 'mongoose';

/**
 * Customer – Bảng khách hàng.
 * - Khách vãng lai: không có thông tin (name mặc định, phone có thể rỗng)
 * - Khách lẻ: có tên, SĐT
 * - Liên kết tài khoản: userId ref User (khách đăng ký online)
 */
const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            default: '',
            trim: true,
        },
        /** Email khách hàng (dùng cho liên hệ, tra cứu) */
        email: {
            type: String,
            default: '',
            trim: true,
            lowercase: true,
        },
        type: {
            type: String,
            enum: ['walkin', 'retail', 'registered'],
            default: 'retail',
        },
        /** Liên kết với User khi khách đăng ký online (trùng SĐT) */
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        /** Số tiền đã tích lũy (điểm tích lũy hoặc tổng chi tiêu) */
        accumulatedAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        /** Soft delete */
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

customerSchema.index({ phone: 1 });
customerSchema.index({ userId: 1 });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
