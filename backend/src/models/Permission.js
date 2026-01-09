import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            default: '',
        },
        resource: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            required: true,
            enum: ['create', 'read', 'update', 'delete', 'manage'],
        },
    },
    { timestamps: true }
);

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;
