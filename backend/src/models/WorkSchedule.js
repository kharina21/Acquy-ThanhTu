import mongoose from 'mongoose';

const workScheduleSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
        },
        location: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        shift: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Shift',
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

workScheduleSchema.index({ employee: 1, date: 1 });

const WorkSchedule = mongoose.model('WorkSchedule', workScheduleSchema);

export default WorkSchedule;

