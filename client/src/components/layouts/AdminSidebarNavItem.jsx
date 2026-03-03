import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';

/**
 * Reusable sidebar nav item với icon + label.
 * Hỗ trợ tooltip khi sidebar thu gọn (is-drawer-close).
 */
export default function AdminSidebarNavItem({ to, icon: Icon, label, ariaLabel, activePaths = [] }) {
    const pathname = useLocation().pathname;
    const isActive =
        activePaths.length > 0
            ? activePaths.some((p) => pathname === p || pathname.startsWith(p + '/'))
            : pathname === to || pathname.startsWith(to + '/');

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
