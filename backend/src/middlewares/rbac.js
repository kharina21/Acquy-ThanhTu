import User from '../models/User.js';

/**
 * Middleware để kiểm tra user có role cụ thể
 * @param {...string} roleNames - Tên các role được phép
 */
export const hasRole = (...roleNames) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const user = await User.findById(req.user._id).populate('roles');

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            const userRoleNames = user.roles.map((role) => role.name);
            const hasRequiredRole = roleNames.some((roleName) => userRoleNames.includes(roleName));

            if (!hasRequiredRole) {
                return res.status(403).json({
                    message: 'Forbidden: Insufficient role permissions',
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking role', error: error.message });
        }
    };
};

/**
 * Middleware để kiểm tra user có permission cụ thể
 * @param {string} resource - Tài nguyên cần kiểm tra
 * @param {string} action - Hành động cần kiểm tra (create, read, update, delete, manage)
 */
export const hasPermission = (resource, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user._id) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const user = await User.findById(req.user._id).populate({
                path: 'roles',
                populate: {
                    path: 'permissions',
                    model: 'Permission',
                },
            });

            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // Lấy tất cả permissions từ các roles của user
            const userPermissions = [];
            user.roles.forEach((role) => {
                if (role.isActive && role.permissions) {
                    role.permissions.forEach((permission) => {
                        userPermissions.push(permission);
                    });
                }
            });

            // Kiểm tra permission
            const hasRequiredPermission = userPermissions.some((permission) => permission.resource === resource && (permission.action === action || permission.action === 'manage'));

            if (!hasRequiredPermission) {
                return res.status(403).json({
                    message: `Forbidden: No permission to ${action} ${resource}`,
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking permission', error: error.message });
        }
    };
};

/**
 * Helper function để kiểm tra user có role (dùng trong controller)
 * @param {Object} user - User object đã populate roles
 * @param {...string} roleNames - Tên các role cần kiểm tra
 * @returns {boolean}
 */
export const checkRole = (user, ...roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map((role) => role.name);
    return roleNames.some((roleName) => userRoleNames.includes(roleName));
};

/**
 * Helper function để kiểm tra user có permission (dùng trong controller)
 * @param {Object} user - User object đã populate roles và permissions
 * @param {string} resource - Tài nguyên cần kiểm tra
 * @param {string} action - Hành động cần kiểm tra
 * @returns {boolean}
 */
export const checkPermission = (user, resource, action) => {
    if (!user || !user.roles) return false;

    const userPermissions = [];
    user.roles.forEach((role) => {
        if (role.isActive && role.permissions) {
            role.permissions.forEach((permission) => {
                userPermissions.push(permission);
            });
        }
    });

    return userPermissions.some((permission) => permission.resource === resource && (permission.action === action || permission.action === 'manage'));
};
