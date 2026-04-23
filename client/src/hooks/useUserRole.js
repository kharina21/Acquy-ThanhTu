import { useAuthStore } from '@/stores/useAuthStore';
import { useMemo } from 'react';
import { roleMeets, rolesMeetsAny } from '@/utils/roleMatch';

/**
 * Hook để kiểm tra role của user hiện tại
 */
export const useUserRole = () => {
    const { user } = useAuthStore();

    // Lấy danh sách tên roles
    const userRoles = useMemo(() => {
        if (!user || !user.roles) return [];
        return user.roles.map((role) => role.name);
    }, [user]);

    // Kiểm tra user có role cụ thể không (slug EN hoặc nhãn VI cùng nhóm)
    const hasRole = (roleName) => {
        return roleMeets(userRoles, roleName);
    };

    const hasAnyRole = (...roleNames) => {
        return rolesMeetsAny(userRoles, ...roleNames);
    };

    const hasAllRoles = (...roleNames) => {
        return roleNames.every((roleName) => roleMeets(userRoles, roleName));
    };

    // Memoize các giá trị boolean để tránh re-render không cần thiết
    const isAdmin = useMemo(() => userRoles.includes('admin'), [userRoles]);
    const isCustomer = useMemo(() => userRoles.includes('customer'), [userRoles]);
    const isUser = useMemo(() => userRoles.includes('user') || userRoles.includes('customer'), [userRoles]);
    /** Bán hàng / POS: seller, staff cũ, hoặc tên role tiếng Việt */
    const isSeller = useMemo(
        () => ['seller', 'staff', 'Nhân viên bán hàng'].some((r) => userRoles.includes(r)),
        [userRoles]
    );
    const isManager = useMemo(() => roleMeets(userRoles, 'manager'), [userRoles]);
    const isWarehouseManager = useMemo(() => roleMeets(userRoles, 'warehouse_manager'), [userRoles]);
    /** @deprecated Dùng isSeller. Giữ để tương thích user cũ có role staff */
    const isStaff = useMemo(() => userRoles.includes('staff'), [userRoles]);
    const isBranchManager = useMemo(() => roleMeets(userRoles, 'manager'), [userRoles]);

    return {
        userRoles,
        hasRole,
        hasAnyRole,
        hasAllRoles,
        isAdmin,
        isCustomer,
        isUser,
        isSeller,
        isManager,
        isWarehouseManager,
        isStaff,
        isBranchManager,
    };
};
