import React from 'react';
import { Outlet } from 'react-router';
import { useUserRole } from '@/hooks/useUserRole';
import AdminLayout from './AdminLayout';

/**
 * Layout component dựa trên role của user
 * Có thể customize layout cho từng role
 *
 * LƯU Ý: Component này được dùng trực tiếp trong Route, nên luôn render <Outlet />
 * để nested routes có thể render.
 */
const RoleBasedLayout = () => {
    const { isAdmin, isSeller, isManager, isWarehouseManager, isBranchManager } = useUserRole();

    // AdminLayout: nội bộ có menu quản trị / kho / bán hàng
    if (isAdmin || isManager || isWarehouseManager || isSeller || isBranchManager) {
        return (
            <AdminLayout>
                <Outlet />
            </AdminLayout>
        );
    }

    // Layout mặc định cho user thường (vd: Hồ sơ cá nhân)
    // Chỉ render Outlet - trang con tự quản lý layout (Header, nội dung, Footer)
    return <Outlet />;
};

export default RoleBasedLayout;
