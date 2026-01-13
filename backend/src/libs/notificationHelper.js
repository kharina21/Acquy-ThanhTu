import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

/**
 * Tạo notification cho một user cụ thể
 */
export const createNotificationForUser = async ({
    userId,
    title,
    message,
    type,
    resource,
    resourceId,
    actionUrl,
    metadata,
}) => {
    try {
        const notification = await Notification.create({
            userId,
            title,
            message,
            type: type || 'info',
            resource,
            resourceId,
            actionUrl,
            metadata,
        });
        return notification;
    } catch (error) {
        console.error('Error creating notification for user:', error);
        throw error;
    }
};

/**
 * Tạo notification cho tất cả users có các roles được chỉ định
 */
export const createNotificationForRoles = async ({
    roleNames,
    title,
    message,
    type,
    resource,
    resourceId,
    actionUrl,
    metadata,
}) => {
    try {
        // Lấy role IDs
        const roles = await Role.find({ name: { $in: roleNames } }).select('_id');
        const roleIds = roles.map((role) => role._id);

        if (roleIds.length === 0) {
            console.warn(`No roles found: ${roleNames.join(', ')}`);
            return [];
        }

        // Lấy tất cả users có các roles này
        const users = await User.find({
            roles: { $in: roleIds },
        }).select('_id');

        if (users.length === 0) {
            console.warn(`No users found with roles: ${roleNames.join(', ')}`);
            return [];
        }

        // Tạo notifications
        const notifications = await Notification.insertMany(
            users.map((user) => ({
                userId: user._id,
                title,
                message,
                type: type || 'info',
                resource,
                resourceId,
                actionUrl,
                metadata,
            }))
        );

        return notifications;
    } catch (error) {
        console.error('Error creating notifications for roles:', error);
        throw error;
    }
};

/**
 * Tạo notification khi có sản phẩm mới
 */
export const notifyProductCreated = async ({ productId, productName, createdBy }) => {
    try {
        const notifications = await createNotificationForRoles({
            roleNames: ['admin', 'owner', 'manager'],
            title: 'Sản phẩm mới',
            message: `Sản phẩm "${productName}" đã được thêm vào hệ thống`,
            type: 'product',
            resource: 'product',
            resourceId: productId,
            actionUrl: `/admin/products/${productId}`,
            metadata: {
                productName,
                createdBy,
            },
        });

        return notifications;
    } catch (error) {
        console.error('Error notifying product creation:', error);
        throw error;
    }
};
