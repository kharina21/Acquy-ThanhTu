import { Search, X } from 'lucide-react';
import React from 'react';
import { ROLE_LABELS } from '@/config/roleConfig';
import { FilterToolbar, FilterToolbarActions, FilterToolbarField } from '@/components/common/FilterToolbar';

const FilterField = ({ filters, setFilters, pagination, setPagination, roles = [] }) => {
    const clearFilters = () => {
        // Giữ nguyên các filter không liên quan (vd: kind cho màn nhân viên)
        setFilters((prev) => ({
            ...prev,
            search: '',
            role: '',
            isVerified: '',
            status: '',
            dateFrom: '',
            dateTo: '',
        }));
        setPagination({ ...pagination, page: 1 });
    };

    const hasActiveFilters = filters.search || filters.role || filters.isVerified || filters.status || filters.dateFrom || filters.dateTo;

    return (
        <div className="bg-base-100 rounded-lg shadow-lg p-6 mb-6">
            <div className="space-y-4">
                {/* Row 1: Search and Role */}
                <FilterToolbar>
                    <FilterToolbarField label="Tìm kiếm" className="min-w-[200px] flex-1 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 z-40 h-5 w-5 -translate-y-1/2 text-base-content/40" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, email, username..."
                                className="input input-bordered input-sm w-full pl-10"
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            />
                        </div>
                    </FilterToolbarField>
                    <FilterToolbarField label="Lọc theo role" className="w-40">
                        <select
                            className="select select-bordered select-sm w-full"
                            value={filters.role}
                            onChange={(e) => {
                                setFilters({ ...filters, role: e.target.value });
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            <option value="">Tất cả</option>
                            {roles.map((role) => (
                                <option key={role._id} value={role.name}>
                                    {ROLE_LABELS[role.name] || role.name}
                                </option>
                            ))}
                        </select>
                    </FilterToolbarField>
                    <FilterToolbarField label="Xác thực" className="w-40">
                        <select
                            className="select select-bordered select-sm w-full"
                            value={filters.isVerified}
                            onChange={(e) => {
                                setFilters({ ...filters, isVerified: e.target.value });
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            <option value="">Tất cả</option>
                            <option value="true">Đã xác thực</option>
                            <option value="false">Chưa xác thực</option>
                        </select>
                    </FilterToolbarField>
                    <FilterToolbarField label="Trạng thái" className="w-40">
                        <select
                            className="select select-bordered select-sm w-full"
                            value={filters.status}
                            onChange={(e) => {
                                setFilters({ ...filters, status: e.target.value });
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            <option value="">Tất cả</option>
                            <option value="active">Hoạt động</option>
                            <option value="inactive">Không hoạt động</option>
                            <option value="banned">Bị cấm</option>
                            <option value="suspended">Tạm ngưng</option>
                        </select>
                    </FilterToolbarField>
                    <FilterToolbarField label="Tìm theo ngày" className="min-w-[260px]">
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                className="input input-bordered input-sm min-w-0 flex-1"
                                value={filters.dateFrom}
                                onChange={(e) => {
                                    setFilters({ ...filters, dateFrom: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            />
                            <span className="shrink-0 text-xs text-base-content/45">–</span>
                            <input
                                type="date"
                                className="input input-bordered input-sm min-w-0 flex-1 disabled:cursor-not-allowed disabled:opacity-50"
                                value={filters.dateTo}
                                disabled={!filters.dateFrom}
                                onChange={(e) => {
                                    setFilters({ ...filters, dateTo: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                                min={filters.dateFrom || undefined}
                            />
                        </div>
                    </FilterToolbarField>
                    {hasActiveFilters && (
                        <FilterToolbarActions>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                                <X className="h-4 w-4" />
                                Xóa bộ lọc
                            </button>
                        </FilterToolbarActions>
                    )}
                </FilterToolbar>


            </div>
        </div>
    )
}

export default FilterField