import React, { useState } from 'react';
import { Award, Banknote, ChevronDown, ChevronLeft, ChevronRight, Link2, Pencil, Phone, Tag, Trash2, User } from 'lucide-react';
import { getCustomerTier } from '@/lib/utils';

const TYPE_LABELS = {
    walkin: 'Khách vãng lai',
    retail: 'Khách lẻ',
    registered: 'Liên kết tài khoản',
};

const TYPE_BADGE = {
    registered: 'bg-sky-500/12 text-sky-950 border border-sky-500/40',
    retail: 'bg-violet-500/12 text-violet-950 border border-violet-400/45',
    walkin: 'bg-base-200/90 text-base-content/80 border border-base-300/80',
};

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

function DetailLine({ icon, label, children }) {
    const IconComponent = icon;
    return (
        <div className='flex items-start gap-3'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200/80 text-base-content/60 ring-1 ring-base-300/50'>
                <IconComponent className='size-4' aria-hidden />
            </span>
            <div className='min-w-0 pt-0.5'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-base-content/45'>{label}</p>
                <div className='text-sm text-base-content'>{children}</div>
            </div>
        </div>
    );
}

const CustomerTable = ({ customers, loading, pagination, setPagination, memberPolicies = [], onEdit, onDelete }) => {
    const [expandedId, setExpandedId] = useState(null);

    if (loading) {
        return (
            <div className='flex justify-center py-20'>
                <span className='loading loading-spinner loading-lg text-primary' />
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className='px-6 py-16 text-center'>
                <User className='mx-auto mb-4 size-16 text-base-content/20' />
                <p className='text-base font-medium text-base-content/70'>Chưa có khách hàng nào</p>
                <p className='mt-1 text-sm text-base-content/50'>Thử đổi bộ lọc hoặc thêm khách mới.</p>
            </div>
        );
    }

    return (
        <>
            <div className='overflow-x-auto overflow-y-auto max-h-[min(78vh,760px)]'>
                <table className='table table-pin-rows w-full min-w-[860px]'>
                    <thead className='sticky top-0 z-20 border-b border-base-300/80 bg-base-200/95 backdrop-blur-md'>
                        <tr className='text-[11px] font-semibold uppercase tracking-wider text-base-content/50'>
                            <th className='w-11 bg-transparent py-3.5' />
                            <th className='bg-transparent py-3.5 font-semibold'>Tên</th>
                            <th className='bg-transparent py-3.5 font-semibold'>Số điện thoại</th>
                            <th className='bg-transparent py-3.5 font-semibold'>Loại khách</th>
                            <th className='bg-transparent py-3.5 font-semibold'>Hạng</th>
                            <th className='bg-transparent py-3.5 text-end font-semibold'>Đã tích</th>
                            <th className='bg-transparent py-3.5 font-semibold'>Tài khoản</th>
                        </tr>
                    </thead>
                    <tbody className='text-[13px]'>
                        {customers.map((c) => {
                            const isExpanded = expandedId === c._id;
                            const tier = getCustomerTier(c.accumulatedAmount, memberPolicies) || 'Chưa có hạng';
                            const typeKey = c.type === 'registered' || c.type === 'retail' || c.type === 'walkin' ? c.type : 'walkin';
                            const typeClass = TYPE_BADGE[typeKey] || TYPE_BADGE.walkin;
                            return (
                                <React.Fragment key={c._id}>
                                    <tr
                                        className={`cursor-pointer border-b border-base-200/70 transition-colors hover:bg-base-200/35 ${
                                            isExpanded ? 'bg-primary/6' : ''
                                        }`}
                                        onClick={() => setExpandedId(isExpanded ? null : c._id)}
                                    >
                                        <td className={`w-11 py-3.5 align-middle ${isExpanded ? 'border-l-[3px] border-l-primary' : ''}`}>
                                            <span className='inline-flex h-9 w-9 items-center justify-center rounded-lg bg-base-200/80 text-base-content/50 ring-1 ring-base-300/50'>
                                                {isExpanded ? (
                                                    <ChevronDown className='size-4' />
                                                ) : (
                                                    <ChevronRight className='size-4' />
                                                )}
                                            </span>
                                        </td>
                                        <td className='max-w-[220px] py-3.5 align-middle'>
                                            <span className='font-semibold text-base-content'>{c.name}</span>
                                        </td>
                                        <td className='py-3.5 align-middle tabular-nums text-base-content/85'>{c.phone || '—'}</td>
                                        <td className='py-3.5 align-middle'>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeClass}`}
                                            >
                                                {TYPE_LABELS[c.type] || c.type}
                                            </span>
                                        </td>
                                        <td className='py-3.5 align-middle'>
                                            {getCustomerTier(c.accumulatedAmount, memberPolicies) ? (
                                                <span className='badge badge-outline badge-sm rounded-full border-primary/35 font-medium'>
                                                    {tier}
                                                </span>
                                            ) : (
                                                <span className='text-sm text-base-content/45'>{tier}</span>
                                            )}
                                        </td>
                                        <td className='py-3.5 text-end align-middle font-semibold tabular-nums text-primary'>
                                            {formatVND(c.accumulatedAmount)}
                                        </td>
                                        <td className='py-3.5 align-middle'>
                                            {c.userId ? (
                                                <span className='font-mono text-sm font-medium text-success'>
                                                    @{c.userId?.username || '—'}
                                                </span>
                                            ) : (
                                                <span className='text-base-content/40'>—</span>
                                            )}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className='border-b border-base-200/80 bg-linear-to-b from-base-200/30 to-base-100'>
                                            <td colSpan={7} className='p-3 sm:p-4' onClick={(e) => e.stopPropagation()}>
                                                <div className='rounded-xl border border-base-300/70 bg-base-100 p-4 shadow-sm sm:p-5'>
                                                    <div className='grid gap-6 sm:grid-cols-2'>
                                                        <div className='space-y-4'>
                                                            <DetailLine icon={User} label='Tên'>
                                                                {c.name}
                                                            </DetailLine>
                                                            <DetailLine icon={Phone} label='Số điện thoại'>
                                                                {c.phone || '—'}
                                                            </DetailLine>
                                                            <DetailLine icon={Tag} label='Loại khách'>
                                                                {TYPE_LABELS[c.type] || c.type}
                                                            </DetailLine>
                                                        </div>
                                                        <div className='space-y-4'>
                                                            <DetailLine icon={Award} label='Hạng'>
                                                                {tier}
                                                            </DetailLine>
                                                            <DetailLine icon={Banknote} label='Số tiền đã tích'>
                                                                <span className='font-semibold text-primary'>{formatVND(c.accumulatedAmount)}</span>
                                                            </DetailLine>
                                                            <DetailLine icon={Link2} label='Tài khoản liên kết'>
                                                                {c.userId ? (
                                                                    <span className='font-mono text-success'>@{c.userId?.username || '—'}</span>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </DetailLine>
                                                        </div>
                                                    </div>
                                                    <div className='mt-5 flex flex-wrap gap-2 border-t border-base-200 pt-4'>
                                                        <button
                                                            type='button'
                                                            className='btn btn-ghost btn-sm gap-2 rounded-xl border border-base-300/80'
                                                            onClick={() => onEdit(c)}
                                                        >
                                                            <Pencil className='size-4' />
                                                            Chỉnh sửa
                                                        </button>
                                                        <button
                                                            type='button'
                                                            className='btn btn-ghost btn-sm gap-2 rounded-xl text-error hover:bg-error/10'
                                                            onClick={() => onDelete(c._id)}
                                                        >
                                                            <Trash2 className='size-4' />
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

            <div className='flex flex-col gap-3 border-t border-base-200/90 bg-base-200/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                <p className='text-sm text-base-content/55'>
                    Hiển thị <span className='font-medium text-base-content'>{customers.length}</span> /{' '}
                    <span className='font-medium text-base-content'>{pagination.total}</span> khách
                </p>
                <div className='join overflow-hidden rounded-lg border border-base-300/80 shadow-sm'>
                    <button
                        type='button'
                        className='join-item btn btn-sm btn-ghost bg-base-100'
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                    >
                        <ChevronLeft className='size-4' />
                    </button>
                    <button type='button' className='join-item btn btn-sm btn-ghost bg-base-100 px-4' disabled>
                        Trang {pagination.page} / {pagination.totalPages}
                    </button>
                    <button
                        type='button'
                        className='join-item btn btn-sm btn-ghost bg-base-100'
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                    >
                        <ChevronRight className='size-4' />
                    </button>
                </div>
            </div>
        </>
    );
};

export default CustomerTable;
