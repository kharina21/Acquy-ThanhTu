import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['product', 'order', 'user', 'system', 'info', 'warning', 'error'],
            default: 'info',
        },
        resource: {
            type: String,
            enum: ['product', 'order', 'user', 'system'],
        },
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            index: true,
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
        actionUrl: {
            type: String, // URL để điều hướng khi click vào notification
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed, // Lưu thêm thông tin bổ sung
        },
    },
    { timestamps: true }
);

// Index để query nhanh hơn
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

// Virtual để populate user details
notificationSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});

notificationSchema.set('toObject', { virtuals: true });
notificationSchema.set('toJSON', { virtuals: true });

// Add pagination plugin
notificationSchema.plugin(mongoosePaginate);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
