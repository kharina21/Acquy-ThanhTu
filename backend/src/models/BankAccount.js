import mongoose from 'mongoose';

/**
 * Tài khoản ngân hàng – dùng cho thanh toán chuyển khoản/VietQR.
 * Mỗi location có thể có nhiều tài khoản.
 * Tham khảo: https://api.vietqr.vn/
 */
const bankAccountSchema = new mongoose.Schema(
    {
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true,
        },
        bankCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        bankName: {
            type: String,
            default: '',
            trim: true,
        },
        bankAccount: {
            type: String,
            required: true,
            trim: true,
        },
        userBankName: {
            type: String,
            required: true,
            trim: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        note: {
            type: String,
            default: '',
            trim: true,
        },
    },
    { timestamps: true }
);

bankAccountSchema.index({ location: 1 });

const BankAccount = mongoose.model('BankAccount', bankAccountSchema);
export default BankAccount;
