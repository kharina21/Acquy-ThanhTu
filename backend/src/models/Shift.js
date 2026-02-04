import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
        checkInStartTime: {
            type: String,
            required: true,
        },
        checkInEndTime: {
            type: String,
            required: true,
        },
        note: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

shiftSchema.index({ name: 1 });
shiftSchema.index({ isActive: 1 });

const Shift = mongoose.model('Shift', shiftSchema);

export default Shift;
