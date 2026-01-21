import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetSchema = new mongoose.Schema(
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
        token: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            default: () => new Date(Date.now() + 60 * 60 * 1000), // 1 giờ
        },
        isUsed: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Index để tự động xóa các token đã hết hạn
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method để tạo reset token
passwordResetSchema.statics.generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;

