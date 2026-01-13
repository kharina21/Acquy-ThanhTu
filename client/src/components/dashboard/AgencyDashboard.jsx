import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';

const AgencyDashboard = () => {
    const { user } = useAuthStore();
    const { userRoles } = useUserRole();

    return (
        <div className='bg-base-100 rounded-lg shadow-lg p-6'>
            <h1 className='text-3xl font-bold mb-6'>Agency Dashboard</h1>
            <div className='space-y-4'>
                <div className='card bg-base-200'>
                    <div className='card-body'>
                        <h2 className='card-title'>Thông tin tài khoản</h2>
                        <p>Username: {user?.username}</p>
                        <p>Email: {user?.email}</p>
                        <p>Roles: {userRoles.join(', ')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgencyDashboard;
