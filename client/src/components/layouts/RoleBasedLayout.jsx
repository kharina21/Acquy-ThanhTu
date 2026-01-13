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
    const { isAdmin, isSeller, isOwner, isAgency, isManager, isStaff } = useUserRole();

    // Layout cho admin
    if (isAdmin) {
        return (
            <AdminLayout>
                <Outlet />
            </AdminLayout>
        );
    }

    // Layout cho owner
    if (isOwner) {
        return (
            <div className='min-h-screen bg-base-200'>
                <div className='container mx-auto px-4 py-8'>
                    <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-4'>
                        <h1 className='text-2xl font-bold'>Owner Panel</h1>
                    </div>
                    <Outlet />
                </div>
            </div>
        );
    }

    // Layout cho manager
    if (isManager) {
        return (
            <div className='min-h-screen bg-base-200'>
                <div className='container mx-auto px-4 py-8'>
                    <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-4'>
                        <h1 className='text-2xl font-bold'>Manager Panel</h1>
                    </div>
                    <Outlet />
                </div>
            </div>
        );
    }

    // Layout cho agency
    if (isAgency) {
        return (
            <div className='min-h-screen bg-base-200'>
                <div className='container mx-auto px-4 py-8'>
                    <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-4'>
                        <h1 className='text-2xl font-bold'>Agency Panel</h1>
                    </div>
                    <Outlet />
                </div>
            </div>
        );
    }

    // Layout cho seller
    if (isSeller) {
        return (
            <div className='min-h-screen bg-base-200'>
                <div className='container mx-auto px-4 py-8'>
                    <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-4'>
                        <h1 className='text-2xl font-bold'>Seller Panel</h1>
                    </div>
                    <Outlet />
                </div>
            </div>
        );
    }

    // Layout cho staff
    if (isStaff) {
        return (
            <div className='min-h-screen bg-base-200'>
                <div className='container mx-auto px-4 py-8'>
                    <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-4'>
                        <h1 className='text-2xl font-bold'>Staff Panel</h1>
                    </div>
                    <Outlet />
                </div>
            </div>
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
