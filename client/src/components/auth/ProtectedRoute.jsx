import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import React, { useEffect } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router';

/**
 * Protected Route - Chỉ kiểm tra authentication và redirect dựa trên role
 * Redirect user đến trang phù hợp dựa trên role khi truy cập "/"
 */
const ProtectedRoute = () => {
    const { user, loading } = useAuthStore();
    const { isAdmin, isUser, isSeller, isOwner, isAgency, isManager, isStaff } = useUserRole();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!loading && user && location.pathname === '/') {
            // Redirect dựa trên role (ưu tiên theo thứ tự)
            if (isAdmin) {
                navigate('/admin/dashboard', { replace: true });
            } else if (isOwner) {
                navigate('/owner/dashboard', { replace: true });
            } else if (isManager) {
                navigate('/manager/dashboard', { replace: true });
            } else if (isAgency) {
                navigate('/agency/dashboard', { replace: true });
            } else if (isSeller) {
                navigate('/seller/dashboard', { replace: true });
            } else if (isStaff) {
                navigate('/staff/dashboard', { replace: true });
            } else if (isUser) {
                navigate('/home', { replace: true });
            }
        }
        if (!user) {
            navigate('/home', { replace: true });
        }
    }, [
        user,
        loading,
        isAdmin,
        isUser,
        isSeller,
        isOwner,
        isAgency,
        isManager,
        isStaff,
        navigate,
        location.pathname,
    ]);

    if (loading) {
        return (
            <div className='min-h-screen flex items-center text-primary justify-center'>
                <span className='loading loading-spinner loading-lg'></span>
            </div>
        );
    }

    // Render tạm thời trong lúc redirect
    return (
        <div className='min-h-screen flex items-center justify-center'>
            <span className='loading loading-spinner text-primary loading-lg'></span>
        </div>
    );
};

export default ProtectedRoute;
