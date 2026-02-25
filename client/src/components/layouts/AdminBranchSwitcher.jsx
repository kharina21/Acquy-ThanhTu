import { ChevronDown, MapPin } from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';

export default function AdminBranchSwitcher() {
    const { locations, currentLocationId, setCurrentLocationId } = useBranchStore();
    const currentLocation = locations.find((l) => l._id === currentLocationId) || null;

    if (locations.length === 0) {
        return (
            <span className="text-sm text-base-content/60 px-2 flex items-center gap-1">
                <MapPin className="size-4" />
                Chưa có chi nhánh
            </span>
        );
    }

    if (locations.length === 1) {
        return (
            <span
                className="text-sm font-medium text-base-content px-2 flex items-center gap-1 max-w-[180px] truncate"
                title={currentLocation?.name}
            >
                <MapPin className="size-4 shrink-0 text-primary" />
                {currentLocation?.name || currentLocation?.code || '—'}
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
                    {currentLocation?.name || currentLocation?.code || 'Chọn chi nhánh'}
                </span>
                <ChevronDown className="size-4 shrink-0" />
            </div>
            <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-100 rounded-box z-[100] w-56 p-2 border border-base-300 shadow-md"
            >
                {locations.map((loc) => (
                    <li key={loc._id}>
                        <button
                            type="button"
                            onClick={() => setCurrentLocationId(loc._id)}
                            className={currentLocationId === loc._id ? 'active font-medium' : ''}
                        >
                            {loc.code} - {loc.name}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
