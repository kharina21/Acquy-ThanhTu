import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { userHasEquivalentRole } from '../utils/roleEquivalence.js';

/** Role có phạm vi chi nhánh theo bản ghi Employee (không phải admin toàn hệ thống). */
const BRANCH_SCOPED_ROLE_NAMES = [
    'manager',
    'Quản lý chi nhánh',
    'warehouse_manager',
    'Quản lý kho',
    'seller',
    'staff',
    'Nhân viên bán hàng',
];

/**
 * Lấy danh sách location ID được phép (Employee.primaryLocation + locations).
 * Admin trả về null = tất cả chi nhánh.
 * Các role kho/chi nhánh/bán hàng: theo Employee; không có Employee → [].
 * User không thuộc nhóm trên → [].
 */
export const getManagerAllowedLocationIds = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    if (roleNames.includes('admin')) return null;

    const needsEmployeeScope = BRANCH_SCOPED_ROLE_NAMES.some((r) => userHasEquivalentRole(roleNames, r));
    if (!needsEmployeeScope) return [];

    const emp = await Employee.findOne({ user: userId, isDeleted: { $ne: true } }).lean();
    if (!emp) return [];

    const ids = [];
    if (emp.primaryLocation) ids.push(String(emp.primaryLocation));
    (emp.locations || []).forEach((loc) => {
        const id = String(loc);
        if (id && id !== 'undefined' && !ids.includes(id)) ids.push(id);
    });
    return ids;
};

/**
 * Kiểm tra locationId có trong danh sách được phép không.
 * @returns { valid: boolean, allowedIds: string[]|null }
 */
export const validateLocationForUser = async (userId, locationId) => {
    const allowedIds = await getManagerAllowedLocationIds(userId);
    if (allowedIds === null) return { valid: true, allowedIds: null };
    if (!locationId || !allowedIds.length) return { valid: false, allowedIds: [] };
    const lid = locationId.toString();
    return { valid: allowedIds.includes(lid), allowedIds };
};
