import ActivityLog from '../models/ActivityLog.js';

/**
 * Utility functions để ghi activity log
 */

export const logActivity = async (options) => {
    try {
        const {
            userId,
            action,
            resource,
            resourceId = null,
            description = '',
            oldData = null,
            newData = null,
            ipAddress = '',
            userAgent = '',
            status = 'success',
            errorMessage = '',
            metadata = {},
        } = options;

        if (!userId || !action || !resource) {
            console.error('ActivityLog: Missing required fields (userId, action, resource)');
            return null;
        }

        const activityLog = await ActivityLog.create({
            userId,
            action,
            resource,
            resourceId,
            description,
            oldData,
            newData,
            ipAddress,
            userAgent,
            status,
            errorMessage,
            metadata,
        });

        return activityLog;
    } catch (error) {
        console.error('Error creating activity log:', error);
        return null;
    }
};

export const logRBACActivity = async (options) => {
    const {
        userId,
        action,
        targetUserId,
        roleName,
        permissionName,
        description,
        ipAddress,
        userAgent,
        status,
        errorMessage,
    } = options;

    return await logActivity({
        userId,
        action,
        resource: 'rbac',
        resourceId: targetUserId || null,
        description: description || `${action} ${roleName || permissionName || 'permission'}`,
        newData: {
            targetUserId,
            roleName,
            permissionName,
        },
        ipAddress,
        userAgent,
        status,
        errorMessage,
        metadata: {
            type: 'rbac',
        },
    });
};

export const logAuthActivity = async (options) => {
    const { userId, action, description, ipAddress, userAgent, status, errorMessage } = options;

    return await logActivity({
        userId,
        action,
        resource: 'auth',
        description,
        ipAddress,
        userAgent,
        status,
        errorMessage,
        metadata: {
            type: 'auth',
        },
    });
};

export const logUserActivity = async (options) => {
    const {
        userId,
        action,
        targetUserId,
        description,
        oldData,
        newData,
        ipAddress,
        userAgent,
        status,
        errorMessage,
    } = options;

    return await logActivity({
        userId,
        action,
        resource: 'user',
        resourceId: targetUserId || null,
        description,
        oldData,
        newData,
        ipAddress,
        userAgent,
        status,
        errorMessage,
        metadata: {
            type: 'user',
        },
    });
};

export const getClientIp = (req) => {
    return (
        req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown'
    );
};

export const getUserAgent = (req) => {
    return req.headers['user-agent'] || 'unknown';
};
