import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { 
    ShoppingCart, 
    ScanBarcode, 
    CreditCard, 
    RotateCcw, 
    PackageCheck, 
    Truck, 
    Users, 
    UserSearch, 
    Clock, 
    CalendarRange, 
    Banknote, 
    FileSignature,
    LogOut
} from 'lucide-react';

const StaffDashboard = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuSections = [
        {
            title: '1. Bán hàng tại quầy (POS)',
            items: [
                { name: 'Tạo đơn hàng (POS)', icon: ShoppingCart, path: '/staff/pos' },
                { name: 'Quét mã vạch', icon: ScanBarcode, path: '/staff/scan' },
                { name: 'Thanh toán & Hóa đơn', icon: CreditCard, path: '/staff/payment' },
                { name: 'Xử lý đổi trả', icon: RotateCcw, path: '/staff/returns' },
            ],
        },
        {
            title: '2. Quản lý đơn hàng & Vận chuyển',
            items: [
                { name: 'Xử lý đơn hàng', icon: PackageCheck, path: '/orders' },
                { name: 'Cập nhật vận chuyển', icon: Truck, path: '/staff/shipping' },
            ],
        },
        {
            title: '3. Quản lý khách hàng',
            items: [
                { name: 'Tra cứu khách hàng', icon: UserSearch, path: '/staff/customers' },
                { name: 'Danh sách khách hàng', icon: Users, path: '/staff/customer-list' },
            ],
        },
        {
            title: '4. Nhân sự & Chấm công',
            items: [
                { name: 'Check-in / Check-out', icon: Clock, path: '/staff/attendance' },
                { name: 'Lịch làm việc', icon: CalendarRange, path: '/staff/schedule' },
                { name: 'Xin nghỉ phép', icon: FileSignature, path: '/staff/leave-request' },
                { name: 'Thông tin lương', icon: Banknote, path: '/staff/salary' },
            ],
        },
    ];

    return (
        <div className='min-h-screen bg-gray-50'>
            
            {/* --- HEADER --- */}
            {/* - Đã BỎ 'fixed', 'top-0', 'z-50' -> Để nó cuộn theo trang.
                - Thêm '-mx-6' (Margin âm 2 bên): Kéo Header tràn ra ngoài padding ngang của cha.
                - Thêm '-mt-6' (Margin âm bên trên): Kéo Header tràn lên sát mép trên.
                - Thêm 'mb-6': Tạo khoảng cách với nội dung bên dưới.
            */}
            <div className='-mx-6 -mt-6 mb-6 bg-gradient-to-r from-primary via-primary/95 to-secondary text-primary-content px-6 py-4 shadow-lg flex justify-between items-center'>
                
                {/* Bên trái */}
                <div>
                    <h1 className='text-2xl font-bold tracking-tight'>Staff Dashboard</h1>
                    <p className='text-primary-content/80 text-sm mt-1'>
                        Xin chào, {user?.lastname || user?.username || 'Nhân viên'}!
                    </p>
                </div>

                {/* Bên phải: Logout */}
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/10 shadow-sm font-medium group"
                >
                    <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                </button>
            </div>

            {/* --- CONTENT AREA --- */}
            {/* Đã BỎ 'pt-28' vì header không còn che nội dung nữa */}
            <div className='w-full space-y-8 animate-fade-in'>
                {menuSections.map((section, sectionIndex) => (
                    <div
                        key={sectionIndex}
                        className='flex flex-col gap-4'
                        style={{ animationDelay: `${sectionIndex * 0.1}s` }}
                    >
                        {/* Tiêu đề nhóm */}
                        <div className='flex items-center gap-3'>
                            <div className='h-1 w-8 bg-gradient-to-r from-primary to-secondary/50 rounded-full'></div>
                            <h2 className='text-lg font-bold text-gray-800 uppercase tracking-wide'>{section.title}</h2>
                            <div className='flex-1 h-px bg-gray-200'></div>
                        </div>

                        {/* Grid Menu Items */}
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
                            {section.items.map((item, itemIndex) => (
                                <Link
                                    key={itemIndex}
                                    to={item.path}
                                    className='group relative bg-white p-5 rounded-xl flex flex-col items-center gap-3 border border-gray-100 cursor-pointer 
                                    hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 
                                    hover:-translate-y-1
                                    transition-all duration-300 ease-out
                                    overflow-hidden'
                                >
                                    {/* Icon container */}
                                    <div className='relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 
                                        flex items-center justify-center
                                        group-hover:from-primary/20 group-hover:via-primary/10 group-hover:to-secondary/20
                                        group-hover:scale-110 group-hover:rotate-3
                                        transition-all duration-300 ease-out
                                        shadow-sm group-hover:shadow-md'>
                                        
                                        <item.icon 
                                            className='w-8 h-8 text-primary group-hover:text-primary-focus transition-colors duration-300' 
                                            strokeWidth={1.5}
                                        />
                                    </div>

                                    {/* Tên chức năng */}
                                    <div className='text-center z-10 flex-1 flex items-center justify-center pt-2'>
                                        <span className='block text-base font-bold text-gray-700 group-hover:text-primary transition-colors duration-300'>
                                            {item.name}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StaffDashboard;