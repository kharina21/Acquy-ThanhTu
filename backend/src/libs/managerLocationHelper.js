import User from '../models/User.js';
import Employee from '../models/Employee.js';

/**
 * Lấy danh sách location ID mà manager được phép truy cập (từ Employee.primaryLocation + locations).
 * Admin trả về null = tất cả. Manager không có Employee hoặc chưa phân công trả về [].
 */
export const getManagerAllowedLocationIds = async (userId) => {
    const user = await User.findById(userId).populate('roles', 'name').lean();
    const roleNames = user?.roles?.map((r) => r.name) || [];
    const isAdmin = roleNames.includes('admin');
    if (isAdmin) return null;

    const isManager = roleNames.includes('manager');
    if (!isManager) return [];

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
