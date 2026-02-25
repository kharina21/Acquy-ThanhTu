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

        // Stock check (kiểm kho)
        { name: 'stock_check:create', description: 'Create stock checks', resource: 'stock_check', action: 'create' },
        { name: 'stock_check:read', description: 'Read stock checks', resource: 'stock_check', action: 'read' },
        { name: 'stock_check:update', description: 'Update stock checks', resource: 'stock_check', action: 'update' },
        { name: 'stock_check:delete', description: 'Delete stock checks', resource: 'stock_check', action: 'delete' },
        { name: 'stock_check:manage', description: 'Manage all stock checks', resource: 'stock_check', action: 'manage' },
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
            name: 'Người dùng thường',
            description: 'Khách hàng / người dùng web',
            permissions: [permissionMap.user?.read, permissionMap.product?.read, permissionMap.order?.create, permissionMap.order?.read].filter(Boolean),
        },
        {
            name: 'Nhân viên bán hàng',
            description: 'Nhân viên bán hàng - Tạo đơn, xem sản phẩm, cập nhật đơn',
            permissions: [
                permissionMap.user?.read,
                permissionMap.product?.read,
                permissionMap.order?.create,
                permissionMap.order?.read,
                permissionMap.order?.update,
                permissionMap.stock_check?.read,
            ].filter(Boolean),
        },
        {
            name: 'Quản lý kho',
            description: 'Quản lý kho - Kiểm kho, nhập/xuất, tồn',
            permissions: [
                permissionMap.user?.read,
                permissionMap.product?.read,
                permissionMap.product?.update,
                permissionMap.order?.read,
                permissionMap.stock_check?.create,
                permissionMap.stock_check?.read,
                permissionMap.stock_check?.update,
            ].filter(Boolean),
        },
        {
            name: 'Quản lý chi nhánh',
            description: 'Quản lý cửa hàng - Nhân viên, sản phẩm, đơn hàng',
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
                permissionMap.stock_check?.read,
                permissionMap.stock_check?.update,
                permissionMap.role?.read,
            ].filter(Boolean),
        },
        {
            name: 'admin',
            description: 'Quản trị viên - Toàn quyền hệ thống',
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
