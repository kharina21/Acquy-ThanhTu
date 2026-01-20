import mongoose from 'mongoose';

const emailVerificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        code: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 phút
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Index để tự động xóa các mã đã hết hạn
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

export default EmailVerification;

