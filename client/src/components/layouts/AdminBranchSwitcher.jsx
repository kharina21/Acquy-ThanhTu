import { ChevronDown, MapPin } from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';

export default function AdminBranchSwitcher() {
    const { hasAnyRole } = useUserRole();
    const { locations, currentLocationId, setCurrentLocationId } = useBranchStore();
    const isAdmin = hasAnyRole('admin');
    /** Admin: dropdown nếu >1 chi nhánh (kèm "Tất cả"). NV nhiều cơ sở: đổi trong phạm vi được phân, không có "Tất cả". */
    const showBranchDropdown = locations.length > 1;
    const currentLocation = locations.find((l) => l._id === currentLocationId) || null;

    if (locations.length === 0) {
        return (
            <span className="text-sm text-base-content/60 px-2 flex items-center gap-1">
                <MapPin className="size-4" />
                Chưa có chi nhánh
            </span>
        );
    }

    /** Một cơ sở hoặc không cần dropdown: chỉ hiển thị nhãn. */
    if (!showBranchDropdown) {
        const label =
            currentLocationId && currentLocationId !== 'all'
                ? currentLocation?.name || currentLocation?.code
                : locations[0]?.name || locations[0]?.code || '—';
        return (
            <span
                className="text-sm font-medium text-base-content px-2 flex items-center gap-1 max-w-[180px] truncate"
                title={typeof label === 'string' ? label : undefined}
            >
                <MapPin className="size-4 shrink-0 text-primary" />
                {label}
            </span>
        );
    }

    return (
        <div className="dropdown dropdown-end">
            <div
                tabIndex={0}
                role="button"
                className="btn btn-sm btn-ghost gap-1 min-h-8 h-8 font-medium"
            >
                <MapPin className="size-4 text-primary shrink-0" />
                <span className="max-w-[140px] truncate">
                    {currentLocationId && currentLocationId !== 'all'
                        ? (currentLocation?.name || currentLocation?.code)
                        : isAdmin
                          ? 'Tất cả chi nhánh'
                          : (locations[0]?.name || locations[0]?.code || '—')}
                </span>
                <ChevronDown className="size-4 shrink-0" />
            </div>
            <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-100 rounded-box z-100 w-56 p-2 border border-base-300 shadow-md"
            >
                {isAdmin ? (
                    <li>
                        <button
                            type="button"
                            onClick={() => setCurrentLocationId('all')}
                            className={!currentLocationId || currentLocationId === 'all' ? 'active font-medium' : ''}
                        >
                            Tất cả chi nhánh
                        </button>
                    </li>
                ) : null}
                {locations.map((loc) => (
                    <li key={loc._id}>
                        <button
                            type="button"
                            onClick={() => setCurrentLocationId(loc._id)}
                            className={currentLocationId === loc._id && currentLocationId !== 'all' ? 'active font-medium' : ''}
                        >
                            {loc.code} - {loc.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
