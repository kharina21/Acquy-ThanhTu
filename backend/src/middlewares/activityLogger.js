import { logActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

export const activityLogger = (options = {}) => {
    return async (req, res, next) => {
        // Lưu original res.json để intercept response
        const originalJson = res.json.bind(res);
        let responseData = null;

        res.json = function (data) {
            responseData = data;
            return originalJson(data);
        };

        // Lưu original res.send để intercept response
        const originalSend = res.send.bind(res);
        let responseBody = null;

        res.send = function (body) {
            responseBody = body;
            return originalSend(body);
        };

        // Chờ response xong mới log
        res.on('finish', async () => {
            try {
                // Chỉ log nếu có user authenticated
                if (!req.user || !req.user._id) {
                    return;
                }

                const {
                    action,
                    resource,
                    logRequestBody = false,
                    logResponseBody = false,
                } = options;

                // Xác định action từ HTTP method nếu không được chỉ định
                let logAction = action;
                if (!logAction) {
                    const method = req.method.toLowerCase();
                    const actionMap = {
                        get: 'read',
                        post: 'create',
                        put: 'update',
                        patch: 'update',
                        delete: 'delete',
                    };
                    logAction = actionMap[method] || 'other';
                }

                // Xác định resource từ route nếu không được chỉ định
                let logResource = resource;
                if (!logResource) {
                    // Lấy resource từ route path (ví dụ: /api/users -> users)
                    const pathParts = req.path.split('/').filter(Boolean);
                    logResource = pathParts[pathParts.length - 1] || 'unknown';
                }

                // Xác định resourceId từ params hoặc body
                const resourceId = req.params.id || req.body?.id || null;

                // Xác định status từ response
                const status =
                    res.statusCode >= 200 && res.statusCode < 300
                        ? 'success'
                        : res.statusCode >= 400
                        ? 'failed'
                        : 'error';
                const errorMessage =
                    status !== 'success' && responseData?.message ? responseData.message : '';

                // Chuẩn bị data để log
                const oldData = logRequestBody ? req.body : null;
                const newData = logResponseBody ? responseData || responseBody : null;

                // Ghi log
                await logActivity({
                    userId: req.user._id,
                    action: logAction,
                    resource: logResource,
                    resourceId,
                    description: `${logAction} ${logResource}${
                        resourceId ? ` (${resourceId})` : ''
                    }`,
                    oldData,
                    newData,
                    ipAddress: getClientIp(req),
                    userAgent: getUserAgent(req),
                    status,
                    errorMessage,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        statusCode: res.statusCode,
                    },
                });
            } catch (error) {
                console.error('Error in activityLogger middleware:', error);
            }
        });

        next();
    };
};
