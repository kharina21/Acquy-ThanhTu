import { cn } from '@/lib/utils';
import NotificationBell from '../notifications/NotificationBell';
import { Link, useLocation, useNavigate } from 'react-router';
import { Boxes, Columns2, House, LayoutDashboard, LogOut, Package, UserRound, UserRoundPen, UsersRound } from 'lucide-react';
import { getInitials, getPrimaryRole } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AdminLayout({ children }) {
    const pathname = useLocation().pathname;
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();



    const handleLogout = async () => {
        await logout();
        navigate('/home', { replace: true });
    };
    return (
        <div className='drawer lg:drawer-open h-screen overflow-hidden'>
            <input id='my-drawer-4' type='checkbox' className='drawer-toggle' />
            <div className='drawer-content h-screen overflow-hidden flex flex-col'>
                {/* Navbar */}
                <nav className='navbar px-4 w-full bg-white border-b border-base-content/10 flex items-center justify-between'>
                    <label
                        htmlFor='my-drawer-4'
                        aria-label='open sidebar'
                        className='btn btn-sm btn-square btn-ghost'
                    >
                        {/* Sidebar toggle icon */}
                        <Columns2 className='my-1.5 inline-block size-4 text-primary' />
                    </label>
                    <div className='px-4 text-xl font-bold text-primary hidden md:block'>Thanh Tú Store</div>
                    <div className='flex items-center gap-2'>
                        <NotificationBell />

                        {/* user profile dropdown */}
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle relative">
                                {user ? (
                                    <div className="avatar relative">
                                        <div className="bg-primary text-primary-content rounded-full size-9 flex items-center justify-center text-sm font-semibold">
                                            <span>{getInitials(user)}</span>
                                        </div>

                                        <span className="absolute -bottom-2 -right-2 badge badge-xs badge-secondary h-4 flex items-center justify-center text-[9px] px-1 border-2 border-white">
                                            {getPrimaryRole(user)}
                                        </span>

                                    </div>
                                ) : (
                                    <UserRound className='size-5 text-primary' />
                                )}
                            </div>
                            <ul tabIndex="-1" className="dropdown-content menu bg-base-100 rounded-box z-100 w-52 p-2 border border-base-300 shadow-md">
                                <li>
                                    <Link to='/profile' aria-label="Xem hồ sơ">
                                        <UserRoundPen className='size-4' aria-hidden="true" />
                                        Hồ sơ
                                    </Link>
                                </li>
                                <li>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left"
                                        aria-label="Đăng xuất"
                                    >
                                        <LogOut className='size-4' aria-hidden="true" />
                                        Đăng xuất
                                    </button>
                                </li>
                            </ul>
                        </div>

                    </div>
                </nav>
                {/* Page content here */}
                {children}
            </div>

            <div className='drawer-side is-drawer-close:overflow-visible '>
                <label
                    htmlFor='my-drawer-4'
                    aria-label='close sidebar'
                    className='drawer-overlay'
                ></label>
                <div className='flex min-h-full flex-col items-start bg-gradient-to-b from-primary to-secondary is-drawer-close:w-14 is-drawer-open:w-64'>
                    {/* Sidebar content here */}
                    <ul className='menu w-full grow text-white font-semibold text-md space-y-2'>
                        {/* List item */}
                        <li className={cn(pathname === '/admin' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/admin'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Trang chủ"
                                aria-label="Trang chủ"
                            >
                                <House className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Trang chủ</span>
                            </Link>
                        </li>

                        {/* List item */}
                        <li className={cn(pathname === '/admin/dashboard' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/admin/dashboard'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Dashboard"
                                aria-label="Dashboard"
                            >
                                <LayoutDashboard className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Dashboard</span>
                            </Link>
                        </li>

                        <li className={cn(pathname === '/admin/products' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/admin/products'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Sản phẩm"
                                aria-label="Quản lý sản phẩm"
                            >
                                <Package className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Sản phẩm</span>
                            </Link>
                        </li>
                        <li className={cn(pathname === '/users' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/users'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Người dùng"
                                aria-label="Quản lý người dùng"
                            >
                                <UsersRound className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Người dùng</span>
                            </Link>
                        </li>
                        <li className={cn(pathname === '/admin/customers' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/admin/customers'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Khách hàng"
                                aria-label="Quản lý khách hàng"
                            >
                                <UsersRound className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Khách hàng</span>
                            </Link>
                        </li>
                        <li className={cn(pathname === '/admin/warehouses' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/admin/warehouses'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Kho hàng"
                                aria-label="Quản lý kho hàng"
                            >
                                <Boxes className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Kho hàng</span>
                            </Link>
                        </li>

                        <li className={cn(pathname === '/profile' && 'bg-base-content/10 border border-primary/30')}>
                            <Link
                                to='/profile'
                                className="is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
                                data-tip="Tài khoản"
                                aria-label="Xem tài khoản"
                            >
                                <UserRound className='my-1.5 inline-block size-4' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate">Tài khoản</span>
                            </Link>
                        </li>


                    </ul>
                </div>
            </div>
        </div>
    );
}
