import React from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import { Link } from 'react-router';

const AdminMenu = () => {
    const { user } = useAuthStore();
    const { userRoles } = useUserRole();

    // Menu items configuration
    const menuSections = [
        {
            title: '1. Nghiệp vụ kho',
            items: [
                { name: 'Nhập kho', image: '/src/assets/kho/nhập kho.PNG', path: '#' },
                { name: 'Xuất kho', image: '/src/assets/kho/xuất kho.PNG', path: '#' },
                { name: 'Chuyển kho', image: '/src/assets/kho/chuyển kho.PNG', path: '#' },
                { name: 'Kiểm kho', image: '/src/assets/kho/kiểm kho.PNG', path: '#' },
                { name: 'Tồn kho', image: '/src/assets/kho/tồn kho.PNG', path: '#' },
                { name: 'Tồn theo kho', image: '/src/assets/kho/tồn theo kho.PNG', path: '#' },
            ],
        },
        {
            title: '2. Quản lý đơn hàng',
            items: [
                { name: 'Đơn hàng', image: '/src/assets/kho/đơn hàng.PNG', path: '#' },
                { name: 'Chi tiết đơn hàng', image: '/src/assets/kho/Chi tiết đơn hàng.PNG', path: '#' },
            ],
        },
        {
            title: '3. Quản lý hệ thống và người dùng',
            items: [
                { name: 'Khách hàng', image: '/src/assets/kho/khách hàng.PNG', path: '#' },
                { name: 'Nhà cung cấp', image: '/src/assets/kho/Nhà cung cấp.PNG', path: '#' },
                { name: 'Danh mục kho', image: '/src/assets/kho/Danh mục kho.PNG', path: '#' },
            ],
        },
        {
            title: '4. Báo cáo và phân tích',
            items: [
                { name: 'Báo cáo', image: '/src/assets/kho/báo cáo.PNG', path: '#' },
                { name: 'Dashboard', image: '/src/assets/kho/báo cáo.PNG', path: '#' },
                { name: 'Cảnh báo hạn sử dụng', image: '/src/assets/kho/Cảnh báo hạn sử dụng.PNG', path: '#' },
            ],
        },
        {
            title: '5. Quản trị hệ thống',
            items: [
                { name: 'Thông tin doanh nghiệp', image: '/src/assets/kho/Thông tin doanh nghiệp.PNG', path: '#' },
                { name: 'Người dùng', image: '/src/assets/kho/Người dùng.PNG', path: '#' },
            ],
        },
        {
            title: '6. Quản lý dữ liệu',
            items: [
                { name: 'Dữ liệu', image: '/src/assets/kho/dữ liệu.PNG', path: '#' },
            ],
        },
    ];

    return (
        <div className='h-full bg-linear-to-br from-base-200 via-base-100 to-primary/5 overflow-hidden flex flex-col'>
            {/* Header with gradient */}
            <div className='bg-linear-to-r from-primary via-primary/95 to-secondary text-primary-content px-6 py-2 sticky top-0 z-10 shadow-lg shrink-0'>
                <h1 className='text-2xl font-bold tracking-tight'>Admin Menu</h1>
                <p className='text-primary-content/80 text-sm mt-1'>Quản lý hệ thống và điều hành</p>
            </div>

            {/* Content area */}
            <div className='h-full w-full p-6 overflow-y-auto space-y-8 flex flex-col flex-1'>
                {menuSections.map((section, sectionIndex) => (
                    <div
                        key={sectionIndex}
                        className='flex flex-col gap-4 animate-fade-in'
                        style={{ animationDelay: `${sectionIndex * 0.1}s` }}
                    >
                        {/* Section header */}
                        <div className='flex items-center gap-3'>
                            <div className='h-1 w-8 bg-linear-to-r from-primary to-secondary/50 rounded-full'></div>
                            <h2 className='text-lg font-bold text-base-content/90'>{section.title}</h2>
                            <div className='flex-1 h-px bg-linear-to-r from-primary/20 to-transparent'></div>
                        </div>

                        {/* Menu items grid */}
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                            {section.items.map((item, itemIndex) => (
                                <Link
                                    key={itemIndex}
                                    to={item.path}
                                    className='group relative bg-white dark:bg-base-300 p-5 rounded-xl flex flex-col items-center gap-3 border border-base-content/10 cursor-pointer 
                                        hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 
                                        hover:-translate-y-1.5 active:translate-y-0
                                        transition-all duration-300 ease-out
                                        overflow-hidden
                                        before:absolute before:inset-0 before:bg-linear-to-br before:from-primary/0 before:via-primary/0 before:to-secondary/0 
                                        hover:before:from-primary/5 hover:before:via-primary/3 hover:before:to-secondary/5
                                        '
                                >
                                    {/* Icon container with gradient background */}
                                    <div className='relative w-16 h-16 rounded-xl bg-linear-to-br from-primary/20 via-primary/10 to-secondary/20 
                                        flex items-center justify-center
                                        group-hover:from-primary/30 group-hover:via-primary/20 group-hover:to-secondary/30
                                        group-hover:scale-110 group-hover:rotate-3
                                        transition-all duration-300 ease-out
                                        shadow-md group-hover:shadow-lg group-hover:shadow-primary/30
                                        group-hover:ring-2 group-hover:ring-primary/20'>
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className='w-12 h-12 object-contain filter group-hover:brightness-110 group-hover:drop-shadow-lg transition-all duration-300'
                                        />
                                    </div>

                                    {/* Label */}
                                    <div className='text-center'>
                                        <span className='text-sm font-semibold text-base-content group-hover:text-primary transition-colors duration-300'>
                                            {item.name}
                                        </span>
                                    </div>

                                    {/* Hover effect indicator */}
                                    {/* <div className='absolute bottom-0 left-0 right-0 h-1 bg-linear-to-r from-primary via-secondary to-primary 
                                        transform scale-x-0 group-hover:scale-x-100 
                                        transition-transform duration-300 origin-center'></div> */}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminMenu;
