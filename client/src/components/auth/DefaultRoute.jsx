import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import React from 'react';
import { Navigate } from 'react-router';

/**
 * Default Route - Redirect user đến trang phù hợp dựa trên role khi truy cập "/"
 * Nếu chưa đăng nhập, redirect đến /home
 */
const DefaultRoute = () => {
    const { user, loading } = useAuthStore();
    const { isAdmin, isUser, isSeller, isOwner, isAgency, isManager, isStaff } = useUserRole();

    // Hiển thị loading khi đang kiểm tra authentication
    if (loading) {
        return (
            <div className='min-h-screen flex items-center text-primary justify-center'>
                <span className='loading loading-spinner loading-lg'></span>
            </div>
        );
    }

    // Nếu chưa đăng nhập, redirect đến home
    if (!user) {
        return <Navigate to='/home' replace />;
    }

    // Redirect dựa trên role (ưu tiên theo thứ tự)
    if (isAdmin) {
        return <Navigate to='/admin' replace />;
    }
    if (isOwner) {
        return <Navigate to='/owner/dashboard' replace />;
    }
    if (isManager) {
        return <Navigate to='/manager/dashboard' replace />;
    }
    if (isAgency) {
        return <Navigate to='/agency/dashboard' replace />;
    }
    if (isSeller) {
        return <Navigate to='/seller/dashboard' replace />;
    }
    if (isStaff) {
        return <Navigate to='/staff/dashboard' replace />;
    }
    if (isUser) {
        return <Navigate to='/home' replace />;
    }

    // Fallback: Nếu có user nhưng không có role nào match, redirect về home
    return <Navigate to='/home' replace />;
};

export default DefaultRoute;
