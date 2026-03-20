import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            default: '',
        },
        address: {
            type: String,
            default: '',
        },
        roles: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Role',
            },
        ],
        // Hạng thành viên hiện tại (MemberPolicy) - dùng cho khách hàng
        memberTier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MemberPolicy',
            default: null,
        },
        /** Liên kết với Customer khi khách đăng ký online (trùng SĐT) */
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
            default: null,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'banned', 'suspended'],
            default: 'active',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Unique username chỉ áp dụng cho user chưa xóa (soft delete)
userSchema.index(
    { username: 1 },
    { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);
// Unique email chỉ áp dụng cho user chưa xóa
userSchema.index(
    { email: 1 },
    { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);

// Unique phoneNumber nhưng cho phép rỗng (null / '')
userSchema.index(
    { phoneNumber: 1 },
    {
        unique: true,
        partialFilterExpression: { phoneNumber: { $nin: [null, ''] } },
    }
);

const User = mongoose.model('User', userSchema);

export default User;
