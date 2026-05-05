import Employee from '../models/Employee.js';
import { userHasAnyOfRoles } from '../utils/roleEquivalence.js';

/** seller / manager / warehouse_manager (và tên tương đương) cần Employee + ít nhất một cơ sở. */
const STAFF_ROLES_REQUIRING_EMPLOYEE = ['seller', 'manager', 'warehouse_manager'];

const STATUS_RESPONSE = {
    inactive: {
        message: 'Tài khoản không hoạt động. Vui lòng liên hệ quản trị viên.',
        code: 'account_inactive',
    },
    banned: {
        message: 'Tài khoản đã bị cấm truy cập.',
        code: 'account_banned',
    },
    suspended: {
        message: 'Tài khoản đang tạm ngưng. Vui lòng liên hệ quản trị viên.',
        code: 'account_suspended',
    },
};

/**
 * @returns {Promise<{ message: string, code: string }|null>} null nếu được phép đăng nhập (tiếp tục cấp token)
 */
export async function getLoginDenialReason(userDoc) {
    if (userDoc.isDeleted) {
        return {
            message: 'Tài khoản không còn tồn tại hoặc đã bị xóa.',
            code: 'account_deleted',
        };
    }

    const st = userDoc.status;
    if (st && st !== 'active') {
        return (
            STATUS_RESPONSE[st] || {
                message: 'Tài khoản không thể đăng nhập. Vui lòng liên hệ quản trị viên.',
                code: 'account_restricted',
            }
        );
    }

    const roleNames = userDoc.roles?.map((r) => r.name).filter(Boolean) || [];
    if (roleNames.includes('admin')) {
        return null;
    }

    if (userHasAnyOfRoles(roleNames, STAFF_ROLES_REQUIRING_EMPLOYEE)) {
        const emp = await Employee.findOne({ user: userDoc._id, isDeleted: { $ne: true } });
        const hasScope =
            emp &&
            emp.isActive !== false &&
            !!(emp.primaryLocation || (Array.isArray(emp.locations) && emp.locations.length > 0));
        if (!hasScope) {
            return {
                message:
                    'Tài khoản chưa được gán hồ sơ nhân viên hoặc cơ sở làm việc. Vui lòng liên hệ quản trị viên để được cấp quyền truy cập.',
                code: 'staff_needs_setup',
            };
        }
    }

    return null;
}
