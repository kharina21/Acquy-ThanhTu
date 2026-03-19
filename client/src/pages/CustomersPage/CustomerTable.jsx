import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Pencil, Trash2, User } from 'lucide-react';
import { getCustomerTier } from '@/lib/utils';

const TYPE_LABELS = {
    walkin: 'Khách vãng lai',
    retail: 'Khách lẻ',
    registered: 'Liên kết tài khoản',
};

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const CustomerTable = ({ customers, loading, pagination, setPagination, memberPolicies = [], onEdit, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="p-12 text-center text-base-content/60">
                <User className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                <p>Chưa có khách hàng nào</p>
            </div>
        );
    }

    return (
        <>
            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                <table className="table">
                    <thead className="bg-blue-100 sticky top-0 z-20 border-b-2 border-base-300">
                        <tr>
                            <th className="w-8 py-3"></th>
                            <th className="font-medium text-neutral text-xs py-3">Tên</th>
                            <th className="font-medium text-neutral text-xs py-3">Số điện thoại</th>
                            <th className="font-medium text-neutral text-xs py-3">Loại khách</th>
                            <th className="font-medium text-neutral text-xs py-3">Hạng</th>
                            <th className="font-medium text-neutral text-xs py-3">Số tiền đã tích</th>
                            <th className="font-medium text-neutral text-xs py-3">Tài khoản liên kết</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {customers.map((c) => {
                            const isExpanded = expandedId === c._id;
                            const tier = getCustomerTier(c.accumulatedAmount, memberPolicies) || 'Chưa có hạng';
                            return (
                                <React.Fragment key={c._id}>
                                    <tr
                                        className={`cursor-pointer hover:bg-base-200/60 transition-colors font-light ${isExpanded ? 'bg-primary/10' : ''}`}
                                        onClick={() => setExpandedId(isExpanded ? null : c._id)}
                                    >
                                        <td className={`w-8 py-3 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </td>
                                        <td className="py-3 font-medium">{c.name}</td>
                                        <td className="py-3">{c.phone || '—'}</td>
                                        <td className="py-3">
                                            <span
                                                className={`badge badge-sm ${
                                                    c.type === 'registered'
                                                        ? 'badge-primary'
                                                        : c.type === 'retail'
                                                          ? 'badge-secondary'
                                                          : 'badge-ghost'
                                                }`}
                                            >
                                                {TYPE_LABELS[c.type] || c.type}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            {getCustomerTier(c.accumulatedAmount, memberPolicies) ? (
                                                <span className="badge badge-sm badge-outline">{tier}</span>
                                            ) : (
                                                <span className="text-base-content/50">{tier}</span>
                                            )}
                                        </td>
                                        <td className="py-3 font-semibold text-primary">
                                            {formatVND(c.accumulatedAmount)}
                                        </td>
                                        <td className="py-3">
                                            {c.userId ? (
                                                <span className="text-success">@{c.userId?.username || '—'}</span>
                                            ) : (
                                                <span className="text-base-content/50">—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr key={`${c._id}-detail`} className="bg-primary/5 border-b-2 border-base-300">
                                            <td colSpan={7} className="p-4 border-l-4 border-l-primary align-top" onClick={(e) => e.stopPropagation()}>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <p><span className="font-medium text-base-content/70">Tên:</span> {c.name}</p>
                                                        <p><span className="font-medium text-base-content/70">Số điện thoại:</span> {c.phone || '—'}</p>
                                                        <p><span className="font-medium text-base-content/70">Loại khách:</span> {TYPE_LABELS[c.type] || c.type}</p>
                                                        <p><span className="font-medium text-base-content/70">Hạng:</span> {tier}</p>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <p><span className="font-medium text-base-content/70">Số tiền đã tích:</span> {formatVND(c.accumulatedAmount)}</p>
                                                        <p><span className="font-medium text-base-content/70">Tài khoản liên kết:</span> {c.userId ? `@${c.userId?.username || '—'}` : '—'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-base-200">
                                                    <button
                                                        className="btn btn-sm btn-ghost"
                                                        onClick={() => onEdit(c)}
                                                    >
                                                        <Pencil className="w-4 h-4 mr-1" />
                                                        Chỉnh sửa
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-ghost text-error"
                                                        onClick={() => onDelete(c._id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Xóa
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center p-4 border-t border-base-200">
                <p className="text-sm text-base-content/60">
                    Hiển thị {customers.length} / {pagination.total} khách hàng
                </p>
                <div className="join">
                    <button
                        type="button"
                        className="join-item btn btn-sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button type="button" className="join-item btn btn-sm" disabled>
                        Trang {pagination.page} / {pagination.totalPages}
                    </button>
                    <button
                        type="button"
                        className="join-item btn btn-sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() =>
                            setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))
                        }
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default CustomerTable;
