import { Columns2, Receipt } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useBranchStore } from '@/stores/useBranchStore';
import { DRAWER_ID } from './AdminSidebar';
import AdminSettingsDropdown from './AdminSettingsDropdown';
import AdminBranchSwitcher from './AdminBranchSwitcher';
import AdminUserDropdown from './AdminUserDropdown';

export default function AdminNavbar() {
    const { hasAnyRole } = useUserRole();
    const needsBranch = hasAnyRole('admin', 'manager', 'warehouse_manager');
    const canSell = hasAnyRole('admin', 'manager', 'seller');
    const currentLocationId = useBranchStore((s) => s.currentLocationId);

    const salesHref = currentLocationId ? `/sales?locationId=${currentLocationId}` : '/sales';

    return (
        <nav className='navbar px-4 w-full bg-white border-b border-base-content/10 flex items-center justify-between'>
            <label
                htmlFor={DRAWER_ID}
                aria-label='open sidebar'
                className='btn btn-sm btn-square btn-ghost'
            >
                <Columns2 className='my-1.5 inline-block size-4 text-primary' />
            </label>
            <div className='px-4 text-xl font-bold text-primary hidden md:block'>Thanh Tú Store</div>
            <div className='flex items-center gap-2'>
                {canSell && (
                    <a
                        href={salesHref}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='btn btn-primary btn-sm gap-1.5'
                        aria-label='Bán hàng - Tạo hóa đơn'
                    >
                        <Receipt className='size-4' />
                        <span className='hidden sm:inline'>Bán hàng</span>
                    </a>
                )}
                <AdminSettingsDropdown />
                {needsBranch && (
                    <div className='flex items-center'>
                        <AdminBranchSwitcher />
                    </div>
                )}
                <AdminUserDropdown />
            </div>
        </nav>
    );
}
