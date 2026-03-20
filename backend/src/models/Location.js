import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        address: {
            type: String,
            default: '',
            trim: true,
        },
        phone: {
            type: String,
            default: '',
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        /** Chỉ một chi nhánh: nhận đơn online, tính tồn cho bán web */
        isOnlineLocation: {
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

locationSchema.index({ isActive: 1 });
locationSchema.index({ isOnlineLocation: 1 });

const Location = mongoose.model('Location', locationSchema);

export default Location;
