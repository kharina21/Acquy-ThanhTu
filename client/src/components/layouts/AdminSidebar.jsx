import { Link, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { SIDEBAR_MENU_ITEMS } from '@/config/sidebarMenuConfig';
import AdminSidebarNavItem from './AdminSidebarNavItem';

const DRAWER_ID = 'my-drawer-4';

function AdminSidebarStaffNavItem({ item }) {
    const pathname = useLocation().pathname;
    const isActive = item.subItems?.some((s) => pathname.startsWith(s.to));

    return (
        <li>
            <div className="relative group">
                <div
                    className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 is-drawer-close:tooltip is-drawer-close:tooltip-right is-drawer-close:justify-center cursor-pointer',
                        'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50',
                        isActive && 'bg-white/15 shadow-md'
                    )}
                    data-tip={item.label}
                    aria-label={item.ariaLabel}
                >
                    <item.icon className="size-5 shrink-0" aria-hidden="true" />
                    <span className="is-drawer-close:hidden truncate font-medium">{item.label}</span>
                </div>
                <div className="absolute is-drawer-close:left-full is-drawer-open:top-full is-drawer-close:top-0 is-drawer-open:left-0 is-drawer-close:w-4 is-drawer-open:w-full is-drawer-close:h-full is-drawer-open:h-2 opacity-0 pointer-events-none group-hover:pointer-events-auto z-40" />
                <div className="absolute is-drawer-close:left-full is-drawer-open:top-full is-drawer-close:top-0 is-drawer-open:left-0 is-drawer-close:ml-1 is-drawer-open:mt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                    <div className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] py-1 overflow-hidden">
                        {item.subItems.map((sub) => (
                            <Link
                                key={sub.to}
                                to={sub.to}
                                className={cn(
                                    'block px-4 py-2.5 text-gray-700 hover:bg-gray-100 transition-colors duration-150 text-sm font-medium',
                                    pathname === sub.to && 'bg-primary text-white hover:bg-primary/90'
                                )}
                            >
                                {sub.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function AdminSidebar() {
    const { hasPermission } = usePermissions();

    const visibleItems = SIDEBAR_MENU_ITEMS.filter((item) => {
        if (item.permission === null) return true;
        return hasPermission(item.permission.resource, item.permission.action);
    });

    return (
        <div className="drawer-side is-drawer-close:overflow-visible">
            <label htmlFor={DRAWER_ID} aria-label="close sidebar" className="drawer-overlay" />
            <div className="flex min-h-full flex-col items-start bg-gradient-to-b from-primary to-secondary is-drawer-close:w-14 is-drawer-open:w-64 transition-all duration-300">
                <ul className="w-full grow text-white space-y-1 px-2 py-4">
                    {visibleItems.map((item) =>
                        item.type === 'submenu' ? (
                            <AdminSidebarStaffNavItem key={item.id} item={item} />
                        ) : (
                            <AdminSidebarNavItem
                                key={item.id}
                                to={item.to}
                                icon={item.icon}
                                label={item.label}
                                ariaLabel={item.ariaLabel}
                                activePaths={item.activePaths}
                            />
                        )
                    )}
                </ul>
            </div>
        </div>
    );
}

export { DRAWER_ID };
