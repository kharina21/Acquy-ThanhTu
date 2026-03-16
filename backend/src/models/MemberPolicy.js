import mongoose from 'mongoose';

/**
 * Chính sách hạng thành viên (Member Policy / Customer Tier)
 * Ví dụ: Đồng, Bạc, Vàng; điều kiện tổng chi tiêu, % giảm giá, mô tả.
 */
const memberPolicySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        /** Tổng chi tiêu (lifetime spending) tối thiểu để đạt hạng này (VNĐ) */
        minTotalSpent: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        /** % giảm giá khi áp dụng hạng này (0–100) */
        discountPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

memberPolicySchema.index({ isActive: 1, minTotalSpent: 1 });

const MemberPolicy = mongoose.model('MemberPolicy', memberPolicySchema);

export default MemberPolicy;

