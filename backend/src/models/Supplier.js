import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            default: '',
            trim: true,
        },
        email: {
            type: String,
            default: '',
            trim: true,
        },
        address: {
            type: String,
            default: '',
            trim: true,
        },
        contactPerson: {
            type: String,
            default: '',
            trim: true,
        },
        note: {
            type: String,
            default: '',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        outstandingDebt: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

supplierSchema.index({ name: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
