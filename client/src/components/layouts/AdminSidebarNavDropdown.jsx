import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

/**
 * Sidebar nav item dạng dropdown - có subItems.
 * Khi sidebar thu gọn (is-drawer-close): hover/click hiển thị dropdown bên cạnh.
 * Khi sidebar mở: dropdown inline bên trong.
 */
export default function AdminSidebarNavDropdown({ icon: Icon, label, ariaLabel, subItems = [], activePaths = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = useLocation().pathname;

    const isAnyActive =
        subItems.some((sub) => pathname === sub.to || pathname.startsWith(sub.to + '/')) ||
        activePaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

    // Auto-open dropdown when a sub-item is active
    useEffect(() => {
        if (isAnyActive) {
            setIsOpen(true);
        }
    }, [isAnyActive]);

    const subMenuContent = (
        <ul className='min-w-[200px] py-1 rounded-lg bg-base-100 text-base-content shadow-lg border border-base-300'>
            {subItems.map((sub) => {
                const isActive = pathname === sub.to;
                return (
                    <li key={sub.id}>
                        {sub.external ? (
                            <a
                                href={sub.to}
                                target='_blank'
                                rel='noopener noreferrer'
                                className={cn('block px-4 py-2.5 text-sm transition-colors', 'hover:bg-base-200')}
                            >
                                {sub.label}
                            </a>
                        ) : (
                            <Link
                                to={sub.to}
                                className={cn('block px-4 py-2.5 text-sm transition-colors', 'hover:bg-base-200', isActive && 'bg-primary/10 text-primary font-medium')}
                            >
                                {sub.label}
                            </Link>
                        )}
                    </li>
                );
            })}
        </ul>
    );

    return (
        <li className='relative group/dropdown'>
            {/* Khi thu gọn: button + dropdown bên phải */}
            <div className='is-drawer-open:hidden relative'>
                <button
                    type='button'
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center justify-center w-full px-2 py-2.5 rounded-lg transition-all duration-200',
                        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50',
                        'tooltip tooltip-right',
                        (isOpen || isAnyActive) && 'bg-white/15',
                    )}
                    data-tip={label}
                    aria-label={ariaLabel || label}
                    aria-expanded={isOpen}
                >
                    <Icon
                        className='size-5 shrink-0'
                        aria-hidden='true'
                    />
                </button>
                {isOpen && <div className='absolute left-full top-0 ml-2 z-100 animate-slide-down'>{subMenuContent}</div>}
            </div>

            {/* Khi mở rộng: dropdown inline */}
            <div className='is-drawer-close:hidden'>
                <button
                    type='button'
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center justify-between w-full gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50',
                        (isOpen || isAnyActive) && 'bg-white/10',
                        isAnyActive && 'font-medium',
                    )}
                    aria-label={ariaLabel || label}
                    aria-expanded={isOpen}
                >
                    <div className='flex items-center gap-3 min-w-0'>
                        <Icon
                            className='size-5 shrink-0'
                            aria-hidden='true'
                        />
                        <span className='truncate font-medium'>{label}</span>
                    </div>
                    <ChevronDown className={cn('size-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
                </button>

                {isOpen && (
                    <ul className='mt-1 ml-4 pl-4 border-l-2 border-white/20 space-y-0.5'>
                        {subItems.map((sub) => {
                            const isActive = pathname === sub.to;
                            return (
                                <li key={sub.id}>
                                    {sub.external ? (
                                        <a
                                            href={sub.to}
                                            target='_blank'
                                            rel='noopener noreferrer'
                                            className={cn('block px-3 py-2 rounded-lg text-sm transition-colors', 'hover:bg-white/10')}
                                        >
                                            {sub.label}
                                        </a>
                                    ) : (
                                        <Link
                                            to={sub.to}
                                            className={cn('block px-3 py-2 rounded-lg text-sm transition-colors', 'hover:bg-white/10', isActive && 'bg-white/15 font-medium')}
                                        >
                                            {sub.label}
                                        </Link>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </li>
    );
}
