import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import mongoose from 'mongoose';
import { logActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

/**
 * Tạo notification mới
 */
export const createNotification = async (req, res) => {
    try {
        const { userId, title, message, type, resource, resourceId, actionUrl, metadata } =
            req.body;

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

        await logActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'notification',
            resourceId: notification._id,
            description: `Created notification for user ${userId}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({ notification });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ message: 'Error creating notification', error: error.message });
    }
};

/**
 * Tạo notification cho nhiều users (ví dụ: admin, owner, manager)
 */
export const createNotificationForRoles = async (req, res) => {
    try {
        const { roleNames, title, message, type, resource, resourceId, actionUrl, metadata } =
            req.body;

        // Lấy tất cả users có các roles được chỉ định
        const users = await User.find({
            roles: {
                $in: await mongoose
                    .model('Role')
                    .find({ name: { $in: roleNames } })
                    .distinct('_id'),
            },
        }).select('_id');

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found with specified roles' });
        }

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

        await logActivity({
            userId: req.user?._id,
            action: 'create',
            resource: 'notification',
            description: `Created ${notifications.length} notifications for roles: ${roleNames.join(
                ', '
            )}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({ notifications, count: notifications.length });
    } catch (error) {
        console.error('Error creating notifications for roles:', error);
        res.status(500).json({ message: 'Error creating notifications', error: error.message });
    }
};

/**
 * Lấy tất cả notifications của user hiện tại
 */
export const getMyNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20, isRead, type } = req.query;
        const query = { userId: req.user._id };

        if (isRead !== undefined) {
            query.isRead = isRead === 'true';
        }

        if (type) {
            query.type = type;
        }

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { createdAt: -1 },
        };

        const notifications = await Notification.paginate(query, options);

        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

/**
 * Đếm số notifications chưa đọc
 */
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            userId: req.user._id,
            isRead: false,
        });

        res.status(200).json({ count });
    } catch (error) {
        console.error('Error counting unread notifications:', error);
        res.status(500).json({ message: 'Error counting notifications', error: error.message });
    }
};

/**
 * Đánh dấu notification là đã đọc
 */
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await logActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'notification',
            resourceId: id,
            description: 'Marked notification as read',
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({ notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: 'Error marking notification', error: error.message });
    }
};

/**
 * Đánh dấu tất cả notifications là đã đọc
 */
export const markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        await logActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'notification',
            description: `Marked ${result.modifiedCount} notifications as read`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            message: 'All notifications marked as read',
            count: result.modifiedCount,
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: 'Error marking notifications', error: error.message });
    }
};

/**
 * Xóa notification
 */
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await logActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'notification',
            resourceId: id,
            description: 'Deleted notification',
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ message: 'Error deleting notification', error: error.message });
    }
};

/**
 * Xóa tất cả notifications đã đọc
 */
export const deleteAllRead = async (req, res) => {
    try {
        const result = await Notification.deleteMany({
            userId: req.user._id,
            isRead: true,
        });

        await logActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'notification',
            description: `Deleted ${result.deletedCount} read notifications`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            message: 'All read notifications deleted',
            count: result.deletedCount,
        });
    } catch (error) {
        console.error('Error deleting read notifications:', error);
        res.status(500).json({ message: 'Error deleting notifications', error: error.message });
    }
};
