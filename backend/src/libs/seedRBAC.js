import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import connectDB from './db.js';

/**
 * Khởi tạo các permissions mặc định
 */
const seedPermissions = async () => {
    const permissions = [
        // User permissions
        { name: 'user:create', description: 'Create users', resource: 'user', action: 'create' },
        { name: 'user:read', description: 'Read users', resource: 'user', action: 'read' },
        { name: 'user:update', description: 'Update users', resource: 'user', action: 'update' },
        { name: 'user:delete', description: 'Delete users', resource: 'user', action: 'delete' },
        { name: 'user:manage', description: 'Manage all users', resource: 'user', action: 'manage' },

        // Product permissions
        { name: 'product:create', description: 'Create products', resource: 'product', action: 'create' },
        { name: 'product:read', description: 'Read products', resource: 'product', action: 'read' },
        { name: 'product:update', description: 'Update products', resource: 'product', action: 'update' },
        { name: 'product:delete', description: 'Delete products', resource: 'product', action: 'delete' },
        { name: 'product:manage', description: 'Manage all products', resource: 'product', action: 'manage' },

        // Order permissions
        { name: 'order:create', description: 'Create orders', resource: 'order', action: 'create' },
        { name: 'order:read', description: 'Read orders', resource: 'order', action: 'read' },
        { name: 'order:update', description: 'Update orders', resource: 'order', action: 'update' },
        { name: 'order:delete', description: 'Delete orders', resource: 'order', action: 'delete' },
        { name: 'order:manage', description: 'Manage all orders', resource: 'order', action: 'manage' },

        // Role & Permission management
        { name: 'role:create', description: 'Create roles', resource: 'role', action: 'create' },
        { name: 'role:read', description: 'Read roles', resource: 'role', action: 'read' },
        { name: 'role:update', description: 'Update roles', resource: 'role', action: 'update' },
        { name: 'role:delete', description: 'Delete roles', resource: 'role', action: 'delete' },
        { name: 'role:manage', description: 'Manage all roles', resource: 'role', action: 'manage' },
    ];

    for (const perm of permissions) {
        await Permission.findOneAndUpdate({ name: perm.name }, perm, { upsert: true, new: true });
    }

    console.log('✅ Permissions seeded successfully');
    return await Permission.find();
};

/**
 * Khởi tạo các roles mặc định
 */
const seedRoles = async (permissions) => {
    const permissionMap = {};
    permissions.forEach((perm) => {
        if (!permissionMap[perm.resource]) {
            permissionMap[perm.resource] = {};
        }
        permissionMap[perm.resource][perm.action] = perm._id;
    });

    const roles = [
        {
            name: 'user',
            description: 'Người dùng thông thường',
            permissions: [permissionMap.user?.read, permissionMap.product?.read, permissionMap.order?.create, permissionMap.order?.read].filter(Boolean),
        },
        {
            name: 'staff',
            description: 'Nhân viên - Quyền hạn cơ bản để thực hiện các tác vụ hàng ngày',
            permissions: [
                permissionMap.user?.read,
                permissionMap.product?.read,
                permissionMap.product?.update,
                permissionMap.order?.create,
                permissionMap.order?.read,
                permissionMap.order?.update,
            ].filter(Boolean),
        },
        {
            name: 'manager',
            description: 'Quản lý - Quyền quản lý sản phẩm, đơn hàng và nhân viên',
            permissions: [
                permissionMap.user?.read,
                permissionMap.user?.update,
                permissionMap.product?.create,
                permissionMap.product?.read,
                permissionMap.product?.update,
                permissionMap.product?.delete,
                permissionMap.order?.read,
                permissionMap.order?.update,
                permissionMap.order?.delete,
            ].filter(Boolean),
        },
        {
            name: 'admin',
            description: 'Quản trị viên - Toàn quyền truy cập và quản lý hệ thống',
            permissions: permissions.map((p) => p._id),
        },
    ];

    for (const roleData of roles) {
        const role = await Role.findOneAndUpdate({ name: roleData.name }, roleData, { upsert: true, new: true });
        console.log(`✅ Role "${role.name}" seeded with ${role.permissions.length} permissions`);
    }

    console.log('✅ Roles seeded successfully');
};

/**
 * Hàm chính để seed RBAC
 */
export const seedRBAC = async () => {
    try {
        await connectDB();
        console.log('🌱 Starting RBAC seed...');

        const permissions = await seedPermissions();
        await seedRoles(permissions);

        console.log('✅ RBAC seeding completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding RBAC:', error);
        process.exit(1);
    }
};

// Chạy seed nếu file được gọi trực tiếp
import { fileURLToPath } from 'url';
import path from 'path';

// Chuyển đổi import.meta.url thành đường dẫn file
const currentFilePath = fileURLToPath(import.meta.url);
// Lấy đường dẫn file được chạy từ process.argv[1]
const mainFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

// So sánh đường dẫn (chuẩn hóa để so sánh)
const normalizePath = (filePath) => path.resolve(filePath).replace(/\\/g, '/').toLowerCase();

if (normalizePath(currentFilePath) === normalizePath(mainFilePath)) {
    seedRBAC();
}
