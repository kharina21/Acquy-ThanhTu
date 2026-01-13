import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
    {
        // User thực hiện hành động
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        // Loại hành động (create, read, update, delete, login, logout, assign_role, revoke_role, etc.)
        action: {
            type: String,
            required: true,
            enum: [
                'create',
                'read',
                'update',
                'delete',
                'login',
                'logout',
                'register',
                'assign_role',
                'revoke_role',
                'update_permission',
                'change_password',
                'verify_email',
                'reset_password',
                'export',
                'import',
                'approve',
                'reject',
                'other',
            ],
        },
        // Tài nguyên bị tác động (user, role, permission, product, order, etc.)
        resource: {
            type: String,
            required: true,
        },
        // ID của tài nguyên bị tác động (nếu có)
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        // Mô tả chi tiết hành động
        description: {
            type: String,
            default: '',
        },
        // Dữ liệu trước khi thay đổi (cho update/delete)
        oldData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // Dữ liệu sau khi thay đổi (cho create/update)
        newData: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        // IP address của user
        ipAddress: {
            type: String,
            default: '',
        },
        // User agent (browser, device info)
        userAgent: {
            type: String,
            default: '',
        },
        // Kết quả của hành động (success, failed, error)
        status: {
            type: String,
            enum: ['success', 'failed', 'error'],
            default: 'success',
        },
        // Thông báo lỗi (nếu có)
        errorMessage: {
            type: String,
            default: '',
        },
        // Metadata bổ sung (JSON)
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

// Indexes để tối ưu query
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ resource: 1, resourceId: 1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });

// Virtual để populate user info
activityLogSchema.virtual('user', {
    ref: 'User',
    localField: 'userId',
    foreignField: '_id',
    justOne: true,
});

// Method để format log message
activityLogSchema.methods.getLogMessage = function () {
    const user = this.user?.username || 'Unknown';
    const action = this.action;
    const resource = this.resource;
    const resourceId = this.resourceId || '';
    return `${user} ${action} ${resource}${resourceId ? ` (${resourceId})` : ''}`;
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
