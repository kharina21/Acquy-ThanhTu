import { useAuthStore } from '@/stores/useAuthStore';
import React from 'react';
import { Navigate, Outlet } from 'react-router';

const PublicRoute = () => {
    const { user } = useAuthStore();
    console.log(user);
    if (user) {
        if (user.roles.some((role) => role.name === 'admin')) {
            return <Navigate to='/admin/dashboard' replace />;
        }
        if (user.roles.some((role) => role.name === 'seller')) {
            return <Navigate to='/seller/dashboard' replace />;
        }
        if (user.roles.some((role) => role.name === 'agency')) {
            return <Navigate to='/agency/dashboard' replace />;
        }
        if (user.roles.some((role) => role.name === 'manager')) {
            return <Navigate to='/manager/dashboard' replace />;
        }
        if (user.roles.some((role) => role.name === 'staff')) {
            return <Navigate to='/staff/dashboard' replace />;
        }
    }

    return <Outlet />;
};

export default PublicRoute;
