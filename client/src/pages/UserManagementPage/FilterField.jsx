import { Search, X } from 'lucide-react';
import React from 'react';
import { ROLE_LABELS } from '@/config/roleConfig';

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
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="">
                        <label className="label">
                            <span className="label-text font-semibold text-sm">Tìm kiếm</span>
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/40 z-40" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, email, username..."
                                className="input w-full pl-10 focus:outline-none"
                                value={filters.search}
                                onChange={(e) => {
                                    setFilters({ ...filters, search: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            />
                        </div>
                    </div>
                    <div className="w-40">
                        <label className="label">
                            <span className="label-text font-semibold text-sm">Lọc theo role</span>
                        </label>
                        <select
                            className="select w-full focus:ring-0 outline-none"
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
                    </div>
                    <div className="w-40">
                        <label className="label">
                            <span className="label-text font-semibold text-sm">Xác thực</span>
                        </label>
                        <select
                            className="select w-full focus:ring-0 outline-none"
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
                    </div>
                    <div className="w-40">
                        <label className="label">
                            <span className="label-text font-semibold text-sm">Trạng thái</span>
                        </label>
                        <select
                            className="select w-full focus:ring-0 outline-none"
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
                    </div>
                    <div className="">
                        <label className="label">
                            <span className="label-text font-semibold text-sm">Tìm theo ngày</span>
                        </label>
                        <div className="flex items-center input outline-none">
                            <input
                                type="date"
                                className="input w-full outline-none focus:outline-none border-none"
                                value={filters.dateFrom}
                                onChange={(e) => {
                                    setFilters({ ...filters, dateFrom: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                            />
                            -
                            <input
                                type="date"
                                className="input w-full outline-none focus:outline-none border-none disabled:opacity-50 disabled:cursor-not-allowed"
                                value={filters.dateTo}
                                disabled={!filters.dateFrom}
                                onChange={(e) => {
                                    setFilters({ ...filters, dateTo: e.target.value });
                                    setPagination({ ...pagination, page: 1 });
                                }}
                                min={filters.dateFrom || undefined}
                            />
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={clearFilters}
                        >
                            <X className="w-4 h-4" />
                            Xóa bộ lọc
                        </button>
                    )}
                </div>


            </div>
        </div>
    )
}

export default FilterField