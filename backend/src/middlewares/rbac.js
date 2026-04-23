import User from '../models/User.js';
import { userHasAnyOfRoles } from '../utils/roleEquivalence.js';

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
            const hasRequiredRole = userHasAnyOfRoles(userRoleNames, roleNames);

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


export const checkRole = (user, ...roleNames) => {
    if (!user || !user.roles) return false;
    const userRoleNames = user.roles.map((role) => role.name);
    return userHasAnyOfRoles(userRoleNames, roleNames);
};
