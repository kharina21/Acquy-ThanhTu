import { usePermissions } from '@/hooks/usePermissions';
import { SIDEBAR_MENU_ITEMS } from '@/config/sidebarMenuConfig';
import AdminSidebarNavItem from './AdminSidebarNavItem';

const DRAWER_ID = 'my-drawer-4';

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
                    {visibleItems.map((item) => (
                        <AdminSidebarNavItem
                            key={item.id}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            ariaLabel={item.ariaLabel}
                            activePaths={item.activePaths}
                            type={item.type}
                            subItems={item.subItems}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}

export { DRAWER_ID };
