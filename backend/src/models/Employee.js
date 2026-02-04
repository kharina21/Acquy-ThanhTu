import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
    {
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

employeeSchema.index({ user: 1 });
employeeSchema.index({ isDeleted: 1, isActive: 1 });

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;

