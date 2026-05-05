import mongoose from 'mongoose';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { userHasEquivalentRole } from '../utils/roleEquivalence.js';

/** Tránh CastError khi query Location — dữ liệu Employee cũ có thể chứa giá trị không phải ObjectId. */
const normalizeLocationObjectId = (raw) => {
    if (raw == null || raw === '') return null;
    const id =
        typeof raw === 'object' && raw !== null && '_id' in raw ? String(raw._id) : String(raw);
    if (!id || id === 'undefined') return null;
    return mongoose.isValidObjectId(id) ? id : null;
};

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
    const push = (raw) => {
        const id = normalizeLocationObjectId(raw);
        if (id && !ids.includes(id)) ids.push(id);
    };
    push(emp.primaryLocation);
    (emp.locations || []).forEach((loc) => push(loc));
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
    const lid = normalizeLocationObjectId(locationId);
    if (!lid) return { valid: false, allowedIds };
    return { valid: allowedIds.includes(lid), allowedIds };
};
