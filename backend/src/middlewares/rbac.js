import User from '../models/User.js';


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
                console.log(`[RBAC] User ${user.username} (${user._id}) has roles: [${userRoleNames.join(', ')}], but required: [${roleNames.join(', ')}]`);
                return res.status(403).json({
                    message: 'Forbidden: Insufficient role permissions',
                    userRoles: userRoleNames,
                    requiredRoles: roleNames,
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: 'Error checking role', error: error.message });
        }
    };
};


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


export const checkRole = (user, ...roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map((role) => role.name);
    return roleNames.some((roleName) => userRoleNames.includes(roleName));
};


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
