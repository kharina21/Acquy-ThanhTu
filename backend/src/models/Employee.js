import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
    {
        /** Mã nhân viên, dạng NV00001, NV00002. Unique, có thể tự đặt hoặc để trống để tự tăng. */
        empCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
            sparse: true,
            unique: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        primaryLocation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Location',
            default: null,
        },
        locations: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Location',
            },
        ],
        salaryType: {
            type: String,
            enum: ['monthly', 'shift', 'hourly'],
            default: 'monthly',
        },
        baseSalary: {
            type: Number,
            default: 0,
        },
        hireDate: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        note: {
            type: String,
            default: '',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

employeeSchema.index({ isDeleted: 1, isActive: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;

