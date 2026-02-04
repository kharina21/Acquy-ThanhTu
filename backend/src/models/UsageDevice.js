import mongoose from 'mongoose';

const usageDeviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
    },
    { timestamps: true }
);

const UsageDevice = mongoose.model('UsageDevice', usageDeviceSchema);

export default UsageDevice;

