import Role from '../models/Role.js';
import connectDB from './db.js';

/**
 * Khởi tạo các roles mặc định (name, description)
 * Dùng tên tiếng Anh để đồng bộ với code
 */
const seedRoles = async () => {
    const roles = [
        { name: 'admin', description: 'Quản trị viên - Toàn quyền hệ thống' },
        { name: 'manager', description: 'Quản lý chi nhánh' },
        { name: 'warehouse_manager', description: 'Quản lý kho - Kiểm kho, nhập/xuất, tồn' },
        { name: 'user', description: 'Người dùng thường' },
        { name: 'customer', description: 'Khách hàng / người dùng web' },
        { name: 'seller', description: 'Nhân viên bán hàng' },
    ];

    for (const roleData of roles) {
        await Role.findOneAndUpdate(
            { name: roleData.name },
            { $set: roleData, $unset: { permissions: '', isActive: '' } },
            { upsert: true, new: true }
        );
        console.log(`✅ Role "${roleData.name}" seeded`);
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

        await seedRoles();

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

const currentFilePath = fileURLToPath(import.meta.url);
const mainFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

const normalizePath = (filePath) => path.resolve(filePath).replace(/\\/g, '/').toLowerCase();

if (normalizePath(currentFilePath) === normalizePath(mainFilePath)) {
    seedRBAC();
}
