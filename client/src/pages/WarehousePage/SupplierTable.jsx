import React, { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const SupplierTable = ({ suppliers, loading, onEdit, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (suppliers.length === 0) {
        return (
            <div className="text-center py-12 text-base-content/60">
                <p>Chưa có nhà cung cấp nào</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table className="table">
                <thead className="bg-blue-100 sticky top-0 z-20">
                    <tr>
                        <th className="w-8"></th>
                        <th className="font-medium">Mã</th>
                        <th className="font-medium">Tên NCC</th>
                        <th className="font-medium">Số điện thoại</th>
                        <th className="font-medium">Email</th>
                        <th className="font-medium text-right">Tổng tiền đã mua</th>
                    </tr>
                </thead>
                <tbody>
                    {suppliers.map((s) => {
                        const isExpanded = expandedId === s._id;
                        return (
                            <React.Fragment key={s._id}>
                                <tr
                                    key={s._id}
                                    className={`hover:bg-base-200/60 cursor-pointer ${isExpanded ? 'bg-primary/10' : ''}`}
                                    onClick={() => setExpandedId(isExpanded ? null : s._id)}
                                >
                                    <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </td>
                                    <td className="font-medium">{s.code}</td>
                                    <td>{s.name}</td>
                                    <td>{s.phone || '—'}</td>
                                    <td>{s.email || '—'}</td>
                                    <td className="text-right">{formatVND(s.totalPurchased)}</td>
                                </tr>
                                {isExpanded && (
                                    <tr className="bg-primary/5">
                                        <td colSpan={6} className="p-4 border-l-4 border-l-primary">
                                            <div className="flex flex-wrap gap-6 items-start">
                                                <div className="flex-1 min-w-[200px] space-y-2">
                                                    <p><span className="font-medium text-base-content/70">Địa chỉ:</span> {s.address || '—'}</p>
                                                    <p><span className="font-medium text-base-content/70">Trạng thái:</span>{' '}
                                                        <span className={`badge badge-sm ${s.isActive ? 'badge-success' : 'badge-ghost'}`}>
                                                            {s.isActive ? 'Hoạt động' : 'Tạm dừng'}
                                                        </span>
                                                    </p>
                                                    {s.note ? (
                                                        <p><span className="font-medium text-base-content/70">Ghi chú:</span> {s.note}</p>
                                                    ) : null}
                                                </div>
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        className="btn btn-sm btn-outline gap-1"
                                                        onClick={() => onEdit(s)}
                                                        title="Chỉnh sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                        Chỉnh sửa
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline btn-error gap-1"
                                                        onClick={() => onDelete(s._id)}
                                                        title="Xóa"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Xóa
                                                    </button>
                                                </div>
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
    );
};

export default SupplierTable;
