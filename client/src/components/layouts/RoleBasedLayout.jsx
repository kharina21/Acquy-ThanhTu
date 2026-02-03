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
    const { isAdmin, isSeller, isManager, isWarehouseManager, isStaff } = useUserRole();

    // Dùng chung AdminLayout cho admin, manager, warehouse_manager, seller, staff
    if (isAdmin || isManager || isWarehouseManager || isSeller || isStaff) {
        return (
            <AdminLayout>
                <Outlet />
            </AdminLayout>
        );
    }

    // Layout mặc định cho user thường
    return (
        <div className='min-h-screen bg-base-200'>
            <div className='container mx-auto px-4 py-8'>
                <Outlet />
            </div>
        </div>
    );
};

export default RoleBasedLayout;
