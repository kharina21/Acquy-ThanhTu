import { cn } from '@/lib/utils';
import NotificationBell from '../notifications/NotificationBell';
import { useLocation } from 'react-router';
import { Boxes, Columns2, House, UserRound, UsersRound } from 'lucide-react';
import ThemeSwitcherButton from '../ThemeSwitcherButton';

export default function AdminLayout({ children }) {
    const pathname = useLocation().pathname;
    return (
        <div className='drawer lg:drawer-open h-screen overflow-hidden'>
            <input id='my-drawer-4' type='checkbox' className='drawer-toggle' />
            <div className='drawer-content h-screen overflow-hidden flex flex-col'>
                {/* Navbar */}
                <nav className='navbar w-full bg-white border-b border-base-content/10 flex items-center justify-between'>
                    <label
                        htmlFor='my-drawer-4'
                        aria-label='open sidebar'
                        className='btn btn-sm btn-square btn-ghost'
                    >
                        {/* Sidebar toggle icon */}
                        <Columns2 className='my-1.5 inline-block size-4' />
                    </label>
                    <div className='px-4 text-xl font-bold text-gray-800'>Thanh Tú Store</div>
                    <div className='flex items-center gap-2'>
                        <NotificationBell className='' />

                        {/* user profile dropdown */}
                        <div className="dropdown dropdown-end">
                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost btn-circle"><UserRound className='size-5' /></div>
                            <ul tabIndex="-1" className="dropdown-content menu bg-base-100 rounded-box z-100 w-40 p-2 border border-base-300 shadow-md">
                                <li><a>Item 1</a></li>
                                <li><a>Item 2</a></li>
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
                <div className='flex min-h-full flex-col items-start bg-white is-drawer-close:w-14 is-drawer-open:w-64 border-r border-base-content/10'>
                    {/* Sidebar content here */}
                    <ul className='menu w-full grow'>
                        {/* List item */}
                        <li className={cn(pathname === '/admin/dashboard' && 'bg-base-content/10')}>
                            <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Trang chủ">
                                {/* Home icon */}
                                <House className='my-1.5 inline-block size-4' />
                                <span className="is-drawer-close:hidden truncate">Trang chủ</span>
                            </button>
                        </li>

                        {/* List item */}
                        <li>
                            <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right" data-tip="Khách hàng">
                                {/* Settings icon */}
                                <UsersRound className='my-1.5 inline-block size-4' />
                                <span className="is-drawer-close:hidden truncate">Khách hàng</span>
                            </button>
                        </li>
                        {/* List item */}
                        <li>
                            <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center" data-tip="Kho hàng">
                                {/* Settings icon */}
                                <Boxes className='my-1.5 inline-block size-4' />
                                <span className="is-drawer-close:hidden truncate">Kho hàng</span>
                            </button>
                        </li>

                        {/* List item */}
                        <li>
                            <button className="is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center" data-tip="Tài khoản">
                                {/* Settings icon */}
                                <UserRound className='my-1.5 inline-block size-4' />
                                <span className="is-drawer-close:hidden truncate">Tài khoản</span>
                            </button>
                        </li>


                    </ul>
                </div>
            </div>
        </div>
    );
}
