import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router';
import { Boxes, Building2, ChevronDown, Columns2, FileBarChart, LayoutDashboard, LogOut, MapPin, Package, Settings, UserRound, UserRoundPen, UsersRound } from 'lucide-react';
import { getInitials, getPrimaryRole } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';
import CreateBranchFirstPage from '@/pages/CreateBranchFirstPage';

export default function AdminLayout({ children }) {
    const pathname = useLocation().pathname;
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();
    const { hasAnyRole, isManager } = useUserRole();
    const {
        locations,
        currentLocationId,
        fetchLocations,
        setCurrentLocationId,
    } = useBranchStore();
    const needsBranch = hasAnyRole('admin', 'manager', 'warehouse_manager');
    const currentLocation = locations.find((l) => l._id === currentLocationId) || null;
    const showCreateBranchFirst = needsBranch && locations.length === 0 && pathname !== '/admin/store-profile';

    useEffect(() => {
        if (user && needsBranch) {
            fetchLocations();
        }
    }, [user, needsBranch, fetchLocations]);

    const handleLogout = async () => {
        useBranchStore.getState().reset();
        await logout();
        navigate('/home', { replace: true });
    };

    return (
        <div className='drawer lg:drawer-open h-screen overflow-hidden'>
            <input id='my-drawer-4' type='checkbox' className='drawer-toggle' defaultChecked />
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
                        {/* Settings dropdown - Hồ sơ cửa hàng */}
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle" aria-label="Cài đặt">
                                <Settings className="size-5 text-primary" />
                            </div>
                            <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-52 p-2 border border-base-300 shadow-md">
                                <li>
                                    <Link to="/admin/store-profile" aria-label="Hồ sơ cửa hàng">
                                        <Building2 className="size-4" aria-hidden />
                                        Hồ sơ cửa hàng
                                    </Link>
                                </li>
                            </ul>
                        </div>
                        {/* Chi nhánh hiện tại: tên hoặc dropdown chuyển đổi */}
                        {needsBranch && (
                            <div className="flex items-center">
                                {locations.length === 0 ? (
                                    <span className="text-sm text-base-content/60 px-2 flex items-center gap-1">
                                        <MapPin className="size-4" />
                                        Chưa có chi nhánh
                                    </span>
                                ) : locations.length === 1 ? (
                                    <span className="text-sm font-medium text-base-content px-2 flex items-center gap-1 max-w-[180px] truncate" title={currentLocation?.name}>
                                        <MapPin className="size-4 shrink-0 text-primary" />
                                        {currentLocation?.name || currentLocation?.code || '—'}
                                    </span>
                                ) : (
                                    <div className="dropdown dropdown-end">
                                        <div tabIndex={0} role="button" className="btn btn-sm btn-ghost gap-1 min-h-8 h-8 font-medium">
                                            <MapPin className="size-4 text-primary shrink-0" />
                                            <span className="max-w-[140px] truncate">{currentLocation?.name || currentLocation?.code || 'Chọn chi nhánh'}</span>
                                            <ChevronDown className="size-4 shrink-0" />
                                        </div>
                                        <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-[100] w-56 p-2 border border-base-300 shadow-md">
                                            {locations.map((loc) => (
                                                <li key={loc._id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentLocationId(loc._id)}
                                                        className={currentLocationId === loc._id ? 'active font-medium' : ''}
                                                    >
                                                        {loc.code} - {loc.name}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
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
                {/* Page content: nếu chưa có chi nhánh và không đang ở trang Hồ sơ cửa hàng → hiển thị màn hình yêu cầu tạo chi nhánh */}
                {showCreateBranchFirst ? <CreateBranchFirstPage /> : children}
            </div>

            <div className='drawer-side is-drawer-close:overflow-visible '>
                <label
                    htmlFor='my-drawer-4'
                    aria-label='close sidebar'
                    className='drawer-overlay'
                ></label>
                <div className='flex min-h-full flex-col items-start bg-gradient-to-b from-primary to-secondary is-drawer-close:w-14 is-drawer-open:w-64 transition-all duration-300'>
                    {/* Sidebar content here */}
                    <ul className='w-full grow text-white space-y-1 px-2 py-4'>
                        {/* Tổng quan - manager → /manager, admin → /admin */}
                        <li>
                            <Link
                                to={isManager ? '/manager' : '/admin'}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    (pathname === '/admin' || pathname === '/admin/dashboard' || pathname === '/manager' || pathname === '/manager/dashboard') && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Tổng quan"
                                aria-label="Tổng quan"
                            >
                                <LayoutDashboard className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Tổng quan</span>
                            </Link>
                        </li>

                        {/* Báo cáo - chỉ manager */}
                        {isManager && (
                            <li>
                                <Link
                                    to='/manager/reports'
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                        pathname === '/manager/reports' && 'bg-white/15 shadow-md'
                                    )}
                                    data-tip="Báo cáo"
                                    aria-label="Báo cáo"
                                >
                                    <FileBarChart className='size-5 shrink-0' aria-hidden="true" />
                                    <span className="is-drawer-close:hidden truncate font-medium">Báo cáo</span>
                                </Link>
                            </li>
                        )}

                        <li>
                            <Link
                                to='/admin/products'
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    pathname === '/admin/products' && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Sản phẩm"
                                aria-label="Quản lý sản phẩm"
                            >
                                <Package className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Sản phẩm</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to='/users'
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    pathname === '/users' && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Người dùng"
                                aria-label="Quản lý người dùng"
                            >
                                <UsersRound className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Người dùng</span>
                            </Link>
                        </li>
                        <li>
                            <div className="relative group">
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center cursor-pointer",
                                        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                        (pathname === '/admin/staffs' || pathname === '/admin/staffs/schedule') && 'bg-white/15 shadow-md'
                                    )}
                                    data-tip="Nhân viên"
                                >
                                    <UserRoundPen className='size-5 shrink-0' aria-hidden="true" />
                                    <span className="is-drawer-close:hidden truncate font-medium">Nhân viên</span>
                                </div>
                                <div className="absolute is-drawer-close:left-full is-drawer-open:top-full is-drawer-close:top-0 is-drawer-open:left-0 is-drawer-close:w-4 is-drawer-open:w-full is-drawer-close:h-full is-drawer-open:h-2 opacity-0 pointer-events-none group-hover:pointer-events-auto z-40"></div>
                                <div className="absolute is-drawer-close:left-full is-drawer-open:top-full is-drawer-close:top-0 is-drawer-open:left-0 is-drawer-close:ml-1 is-drawer-open:mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                                    <div className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] py-1 overflow-hidden">
                                        <Link
                                            to='/admin/staffs'
                                            className={cn(
                                                "block px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors duration-150 text-sm font-medium",
                                                pathname === '/admin/staffs' && 'bg-primary text-white hover:bg-primary/90'
                                            )}
                                        >
                                            Danh sách nhân viên
                                        </Link>
                                        <Link
                                            to='/admin/staffs/schedule'
                                            className={cn(
                                                "block px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors duration-150 text-sm font-medium",
                                                pathname === '/admin/staffs/schedule' && 'bg-primary text-white hover:bg-primary/90'
                                            )}
                                        >
                                            Lịch làm việc
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </li>
                        <li>
                            <Link
                                to='/admin/customers'
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    pathname === '/admin/customers' && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Khách hàng"
                                aria-label="Quản lý khách hàng"
                            >
                                <UsersRound className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Khách hàng</span>
                            </Link>
                        </li>
                        <li>
                            <Link
                                to='/admin/warehouses'
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    pathname === '/admin/warehouses' && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Kho hàng"
                                aria-label="Quản lý kho hàng"
                            >
                                <Boxes className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Kho hàng</span>
                            </Link>
                        </li>

                        <li>
                            <Link
                                to='/profile'
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center",
                                    "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    pathname === '/profile' && 'bg-white/15 shadow-md'
                                )}
                                data-tip="Tài khoản"
                                aria-label="Xem tài khoản"
                            >
                                <UserRound className='size-5 shrink-0' aria-hidden="true" />
                                <span className="is-drawer-close:hidden truncate font-medium">Tài khoản</span>
                            </Link>
                        </li>


                    </ul>
                </div>
            </div>
        </div >
    );
}
