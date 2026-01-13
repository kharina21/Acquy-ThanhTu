import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router';

const AdminDashboard = () => {
    const { user } = useAuthStore();
    const { userRoles } = useUserRole();

    return (
        <div className='h-full bg-base-300 overflow-hidden flex flex-col'>
            <h1 className='text-xl font-semibold px-4 py-2 bg-white sticky top-1 z-10 border-b border-base-content/20 shrink-0'>
                Admin Dashboard
            </h1>
            <div className='h-full w-full p-4 rounded-md overflow-y-auto space-y-4 flex flex-col flex-1'>
                {/* Nghiệp vụ kho */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>1. Nghiệp vụ kho</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Nhập kho */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/nhập kho.PNG'
                                    alt='nhập kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Nhập kho</div>
                        </Link>
                        {/* Xuất kho */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/xuất kho.PNG'
                                    alt='xuất kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Xuất kho</div>
                        </Link>

                        {/* Chuyển kho */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/chuyển kho.PNG'
                                    alt='chuyển kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Chuyển kho</div>
                        </Link>

                        {/* Kiểm kho*/}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/kiểm kho.PNG'
                                    alt='kiểm kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Kiểm kho</div>
                        </Link>
                        {/* Tồn kho*/}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img src='/src/assets/kho/tồn kho.PNG' alt='tồn kho' className='' />
                            </div>
                            <div className='text-md font-semibold'>Tồn kho</div>
                        </Link>
                        {/* Tồn theo kho*/}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/tồn theo kho.PNG'
                                    alt='tồn theo kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Tồn theo kho</div>
                        </Link>
                    </div>
                </div>

                {/* Quản lý đơn hàng */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>2. Quản lý đơn hàng</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Đơn hàng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/đơn hàng.PNG'
                                    alt='Đơn hàng'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Đơn hàng</div>
                        </Link>

                        {/* Chi tiết hàng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Chi tiết đơn hàng.PNG'
                                    alt='Chi tiết đơn hàng'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Chi tiết đơn hàng</div>
                        </Link>
                    </div>
                </div>

                {/* Quản lý danh mục */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>3. Quản lý hệ thống và người dùng</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Khách hàng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/khách hàng.PNG'
                                    alt='Khách hàng'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Khách hàng</div>
                        </Link>

                        {/* Nhà cung cấp */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Nhà cung cấp.PNG'
                                    alt='Nhà cung cấp'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Nhà cung cấp</div>
                        </Link>
                        {/* Danh mục kho */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Danh mục kho.PNG'
                                    alt='Danh mục kho'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Danh mục kho</div>
                        </Link>
                    </div>
                </div>

                {/* Báo cáo và phân tích */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>4. Báo cáo và phân tích</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Khách hàng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img src='/src/assets/kho/báo cáo.PNG' alt='báo cáo' className='' />
                            </div>
                            <div className='text-md font-semibold'>Báo cáo</div>
                        </Link>

                        {/* Dashboard */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/báo cáo.PNG'
                                    alt=' Dashboard'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Dashboard</div>
                        </Link>

                        {/* Cảnh báo hạn sử dụng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Cảnh báo hạn sử dụng.PNG'
                                    alt=' Cảnh báo hạn sử dụng'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Cảnh báo hạn sử dụng</div>
                        </Link>
                    </div>
                </div>

                {/* Quản trị hệ thống */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>5. Quản trị hệ thống</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Thông tin doanh nghiệp */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Thông tin doanh nghiệp.PNG'
                                    alt='Thông tin doanh nghiệp'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Thông tin doanh nghiệp</div>
                        </Link>

                        {/* Người dùng */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img
                                    src='/src/assets/kho/Người dùng.PNG'
                                    alt='Thông tin doanh nghiệp'
                                    className=''
                                />
                            </div>
                            <div className='text-md font-semibold'>Người dùng</div>
                        </Link>
                    </div>
                </div>

                {/* Quản lý dữ liệu */}
                <div className='flex flex-col gap-2'>
                    <div className='text-sm font-semibold'>5. Quản lý dữ liệu</div>
                    <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {/* Dữ liệu */}
                        <Link
                            to='#'
                            className='bg-white p-2 rounded-md flex gap-3 items-center justify-start border border-base-content/10 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-300'
                        >
                            <div className='w-15 h-15 p-1 rounded-sm bg-base-300 flex items-center justify-center'>
                                <img src='/src/assets/kho/dữ liệu.PNG' alt='dữ liệu' className='' />
                            </div>
                            <div className='text-md font-semibold'>Dữ liệu</div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
