import Role from '../models/Role.js';

export const getDefaultRole = async () => {
    try {
        const defaultRole = await Role.findOne({ name: 'user' });
        if (!defaultRole) {
            throw new Error('Default role "user" not found. Please run seed:rbac first.');
        }
        return defaultRole;
    } catch (error) {
        throw new Error(`Error getting default role: ${error.message}`);
    }
};

export const assignDefaultRole = async (user) => {
    try {
        const defaultRole = await getDefaultRole();
        if (!user.roles || user.roles.length === 0) {
            user.roles = [defaultRole._id];
            await user.save();
        }
        return user;
    } catch (error) {
        throw new Error(`Error assigning default role: ${error.message}`);
    }
};

export const assignRoleByName = async (user, roleName) => {
    try {
        const role = await Role.findOne({ name: roleName });
        if (!role) {
            throw new Error(`Role "${roleName}" not found`);
        }

        if (!user.roles) {
            user.roles = [];
        }

        // Kiểm tra xem user đã có role này chưa
        const hasRole = user.roles.some((roleId) => roleId.toString() === role._id.toString());

        if (!hasRole) {
            user.roles.push(role._id);
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error assigning role: ${error.message}`);
    }
};

export const removeRoleByName = async (user, roleName) => {
    try {
        const role = await Role.findOne({ name: roleName });
        if (!role) {
            throw new Error(`Role "${roleName}" not found`);
        }

        if (user.roles) {
            user.roles = user.roles.filter((roleId) => roleId.toString() !== role._id.toString());
            await user.save();
        }

        return user;
    } catch (error) {
        throw new Error(`Error removing role: ${error.message}`);
    }
};
