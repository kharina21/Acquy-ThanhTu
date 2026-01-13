import { cn } from '@/lib/utils';
import NotificationBell from '../notifications/NotificationBell';
import { useLocation } from 'react-router';

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
                        className='btn btn-square btn-ghost'
                    >
                        {/* Sidebar toggle icon */}
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            strokeLinejoin='round'
                            strokeLinecap='round'
                            strokeWidth='2'
                            fill='none'
                            stroke='currentColor'
                            className='my-1.5 inline-block size-4'
                        >
                            <path d='M4 4m0 2a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z'></path>
                            <path d='M9 4v16'></path>
                            <path d='M14 10l2 2l-2 2'></path>
                        </svg>
                    </label>
                    <div className='px-4 text-xl font-bold text-gray-800'>Thanh Tú Store</div>
                    <NotificationBell className='ml-auto' />
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
                            <button
                                className='is-drawer-close:tooltip is-drawer-close:tooltip-right'
                                data-tip='Homepage'
                            >
                                {/* Home icon */}
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    viewBox='0 0 24 24'
                                    strokeLinejoin='round'
                                    strokeLinecap='round'
                                    strokeWidth='2'
                                    fill='none'
                                    stroke='currentColor'
                                    className='my-1.5 inline-block size-4'
                                >
                                    <path d='M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8'></path>
                                    <path d='M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'></path>
                                </svg>
                                <span className='is-drawer-close:hidden'>Homepage</span>
                            </button>
                        </li>

                        {/* List item */}
                        <li>
                            <button
                                className='is-drawer-close:tooltip is-drawer-close:tooltip-right'
                                data-tip='Settings'
                            >
                                {/* Settings icon */}
                                <svg
                                    xmlns='http://www.w3.org/2000/svg'
                                    viewBox='0 0 24 24'
                                    strokeLinejoin='round'
                                    strokeLinecap='round'
                                    strokeWidth='2'
                                    fill='none'
                                    stroke='currentColor'
                                    className='my-1.5 inline-block size-4'
                                >
                                    <path d='M20 7h-9'></path>
                                    <path d='M14 17H5'></path>
                                    <circle cx='17' cy='17' r='3'></circle>
                                    <circle cx='7' cy='7' r='3'></circle>
                                </svg>
                                <span className='is-drawer-close:hidden'>Settings</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
