import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

/**
 * Reusable sidebar nav item với icon + label.
 * Hỗ trợ tooltip khi sidebar thu gọn (is-drawer-close).
 * Hỗ trợ type: 'submenu' với subItems.
 */
export default function AdminSidebarNavItem({ to, icon: Icon, label, ariaLabel, activePaths = [], type, subItems = [] }) {
    const pathname = useLocation().pathname;
    const [open, setOpen] = useState(true);
    const isSubmenu = type === 'submenu' && subItems?.length > 0;

    const isActive = isSubmenu
        ? subItems.some((s) => pathname === s.to || pathname.startsWith(s.to + '/'))
        : activePaths?.length > 0
          ? activePaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
          : pathname === to || (to && pathname.startsWith(to + '/'));

    if (isSubmenu) {
        return (
            <li>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className={cn(
                        'flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center',
                        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50',
                        isActive && 'bg-white/10'
                    )}
                    data-tip={label}
                    aria-label={ariaLabel || label}
                >
                    <Icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="is-drawer-close:hidden grow truncate text-left font-medium">{label}</span>
                    <span className="is-drawer-close:hidden shrink-0">
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </span>
                </button>
                {open && (
                    <ul className="is-drawer-close:hidden mt-1 space-y-0.5 pl-4">
                        {subItems.map((sub) => {
                            const subActive = pathname === sub.to || pathname.startsWith(sub.to + '/');
                            return (
                                <li key={sub.to}>
                                    <Link
                                        to={sub.to}
                                        className={cn(
                                            'block px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/10',
                                            subActive && 'bg-white/15 font-medium'
                                        )}
                                    >
                                        {sub.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </li>
        );
    }

    return (
        <li>
            <Link
                to={to}
                className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center',
                    'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50',
                    isActive && 'bg-white/15 shadow-md'
                )}
                data-tip={label}
                aria-label={ariaLabel || label}
            >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="is-drawer-close:hidden truncate font-medium">{label}</span>
            </Link>
        </li>
    );
}
