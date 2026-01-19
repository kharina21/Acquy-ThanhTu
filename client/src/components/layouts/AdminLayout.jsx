import { cn } from '@/lib/utils';
import NotificationBell from '../notifications/NotificationBell';
import { useLocation } from 'react-router';
import { Columns2, House } from 'lucide-react';

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
                        <Columns2  className='my-1.5 inline-block size-4'/>
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
                                <House className='my-1.5 inline-block size-4'/>
                              
                                <span className='is-drawer-close:hidden'>Homepage</span>
                            </button>
                        </li>

                        {/* List item */}
                       
                    </ul>
                </div>
            </div>
        </div>
    );
}
