import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';

/**
 * Tổng quan cho seller / NV bán hàng / quản lý kho (nội dung chào mừng; điều hướng chi tiết qua sidebar).
 */
const StaffDashboard = () => {
    const { user } = useAuthStore();
    const { isWarehouseManager } = useUserRole();
    const displayName =
        [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
        user?.username ||
        'bạn';

    const hint = isWarehouseManager
        ? 'Vui lòng chọn mục trên thanh bên để kiểm kho, nhập — xuất, quét xuất tại quầy hoặc báo cáo tồn kho.'
        : 'Vui lòng chọn mục trên thanh bên để bán hàng, xem đơn hàng hoặc dùng các chức năng khác.';

    return (
        <div className='flex flex-1 flex-col items-center justify-center min-h-[min(60vh,520px)] px-6 py-12 bg-base-200/30'>
            <div className='max-w-md w-full rounded-2xl bg-base-100 border border-base-200 shadow-md px-8 py-10 text-center'>
                <h1 className='text-2xl font-bold text-base-content tracking-tight'>Xin chào, {displayName}!</h1>
                <p className='mt-4 text-base text-base-content/70 leading-relaxed'>
                    Chào mừng bạn đến hệ thống <span className='font-semibold text-base-content'>Thanh Tú Store</span>.
                    {hint}
                </p>
            </div>
        </div>
    );
};

export default StaffDashboard;
