import ActivityLog from '../models/ActivityLog.js';
import { authenticate } from '../middlewares/authenticate.js';

/**
 * Lấy danh sách activity logs với pagination và filters
 */
export const getActivityLogs = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            userId,
            action,
            resource,
            resourceId,
            status,
            startDate,
            endDate,
            search,
        } = req.query;

        // Build query
        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (action) {
            query.action = action;
        }

        if (resource) {
            query.resource = resource;
        }

        if (resourceId) {
            query.resourceId = resourceId;
        }

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: 'i' } },
                { resource: { $regex: search, $options: 'i' } },
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get logs with user populated
        const logs = await ActivityLog.find(query)
            .populate('userId', 'username email firstName lastName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Get total count
        const total = await ActivityLog.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('Error getting activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy activity logs',
            error: error.message,
        });
    }
};

/**
 * Lấy chi tiết một activity log
 */
export const getActivityLogById = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await ActivityLog.findById(id)
            .populate('userId', 'username email firstName lastName')
            .lean();

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Activity log không tồn tại',
            });
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        console.error('Error getting activity log:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy activity log',
            error: error.message,
        });
    }
};

/**
 * Lấy activity logs của user hiện tại
 */
export const getMyActivityLogs = async (req, res) => {
    try {
        const { page = 1, limit = 20, action, resource, status } = req.query;

        const query = {
            userId: req.user._id,
        };

        if (action) {
            query.action = action;
        }

        if (resource) {
            query.resource = resource;
        }

        if (status) {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        const logs = await ActivityLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        const total = await ActivityLog.countDocuments(query);

        res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('Error getting my activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy activity logs',
            error: error.message,
        });
    }
};

/**
 * Xóa activity log (chỉ admin)
 */
export const deleteActivityLog = async (req, res) => {
    try {
        const { id } = req.params;

        const log = await ActivityLog.findByIdAndDelete(id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Activity log không tồn tại',
            });
        }

        res.status(200).json({
            success: true,
            message: 'Đã xóa activity log thành công',
        });
    } catch (error) {
        console.error('Error deleting activity log:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xóa activity log',
            error: error.message,
        });
    }
};
