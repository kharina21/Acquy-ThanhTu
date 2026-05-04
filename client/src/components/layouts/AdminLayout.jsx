import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';
import CreateBranchFirstPage from '@/pages/CreateBranchFirstPage';
import AdminNavbar from './AdminNavbar';
import AdminSidebar, { DRAWER_ID } from './AdminSidebar';

export default function AdminLayout({ children }) {
    const pathname = useLocation().pathname;
    const { hasAnyRole } = useUserRole();
    const { locations, fetchLocations } = useBranchStore();
    const user = useAuthStore((s) => s.user);

    const needsBranch = hasAnyRole(
        'admin',
        'manager',
        'warehouse_manager',
        'seller',
        'Quản lý chi nhánh',
        'staff',
        'Nhân viên bán hàng'
    );
    const showCreateBranchFirst =
        needsBranch && locations.length === 0 && pathname !== '/admin/store-profile';

    useEffect(() => {
        if (user && needsBranch) {
            const scope = hasAnyRole('admin') ? 'all' : 'mine';
            fetchLocations({ scope });
        }
    }, [user, needsBranch, hasAnyRole, fetchLocations]);

    return (
        <div className="drawer lg:drawer-open h-screen overflow-hidden">
            <input id={DRAWER_ID} type="checkbox" className="drawer-toggle" defaultChecked />
            <div className="drawer-content flex flex-col h-full overflow-hidden">
                {/* Navbar — fixed at top, always visible */}
                <div className="shrink-0 bg-white border-b border-base-content/10 z-50">
                    <AdminNavbar />
                </div>
                {/* Scrollable content area */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    {showCreateBranchFirst ? <CreateBranchFirstPage /> : children}
                </div>
            </div>
            <AdminSidebar />
        </div>
    );
}
