import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ExternalLink,
    FileStack,
    MapPin,
    Package,
    Printer,
    ShoppingCart,
    Store,
    User,
    UserCircle,
} from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';
import { getMyOrders, updateOrder, deletePreOrder } from '@/services/orderService';
import { printVatInvoiceForOrderId } from '@/lib/vatInvoicePrint';
import { toast } from 'sonner';
import { STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/components/order/StatusBadge';
import { useUserRole } from '@/hooks/useUserRole';
import LegacyInvoiceImportModal from './LegacyInvoiceImportModal';
import { FilterToolbar, FilterToolbarField } from '@/components/common/FilterToolbar';

const STATUS_LABELS = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận · chờ xuất kho',
    completed: 'Đã xuất kho / hoàn thành',
    cancelled: 'Đã hủy',
};

/** Trạng thái có thể gán tay qua danh sách — «hoàn thành» chỉ do kho/ POS. */
const STATUS_MANUAL_SELECT_KEYS = ['pending', 'confirmed', 'cancelled'];

const PAYMENT_STATUS_LABELS = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
    refunded: 'Đã hoàn tiền',
};

/** Loại đơn bán hàng (Order.channel) */
const ORDER_TYPE_LABELS = {
    online: 'Bán trực tuyến',
    in_store: 'Bán cửa hàng',
};

const getStatusSelectClass = (status) => {
    const s = status && STATUS_CONFIG[status] ? status : 'pending';
    return STATUS_CONFIG[s]?.className || 'bg-base-100';
};

const getPaymentSelectClass = (status) => {
    return PAYMENT_STATUS_CONFIG[status || 'pending']?.className || 'bg-base-100';
};

function InfoRow({ icon, label, children }) {
    const IconComponent = icon;
    return (
        <div className='flex items-start gap-3'>
            <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200/80 text-base-content/70 ring-1 ring-base-300/50'>
                <IconComponent className='h-4 w-4' aria-hidden />
            </span>
            <div className='min-w-0 pt-0.5'>
                <p className='text-[11px] font-semibold uppercase tracking-wide text-base-content/45'>{label}</p>
                <div className='text-sm text-base-content leading-snug'>{children}</div>
            </div>
        </div>
    );
}

/** Tiền hàng chưa thuế, thuế GTGT (từ dòng), chiết khấu — cùng logic tóm tắt với trang chi tiết đơn. */
function computeOrderInvoiceRollup(order) {
    const items = order?.items || [];
    const netSubtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.price) || 0), 0);
    let vatTotal = items.reduce((s, i) => s + (Number(i.vatAmount) || 0), 0);
    if (vatTotal <= 0) {
        vatTotal = items.reduce((s, i) => {
            const net = (Number(i.quantity) || 0) * (Number(i.price) || 0);
            const gross = i.total != null && i.total !== '' ? Number(i.total) : net;
            return s + (Number.isFinite(gross) ? Math.max(0, gross - net) : 0);
        }, 0);
    }
    const discount = Math.max(0, Number(order?.discount) || 0);
    const grossBeforeDiscount = netSubtotal + vatTotal;
    return { netSubtotal, vatTotal, discount, grossBeforeDiscount };
}

export default function AdminOrderManagementPage({ type = 'invoices' }) {
    const { hasAnyRole } = useUserRole();
    /** Trùng quyền POST /orders/from-items — nhập chứng từ giấy cũ. */
    const canImportLegacy = hasAnyRole(
        'admin',
        'manager',
        'Quản lý chi nhánh',
        'seller',
        'staff',
        'Nhân viên bán hàng',
    );
    const { locations, currentLocationId, setCurrentLocationId, fetchLocations, loaded: branchLocationsLoaded } =
        useBranchStore();
    const [expandedId, setExpandedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', paymentStatus: '', legacy: '', channel: '' });
    const [updatingId, setUpdatingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [printingInvoiceId, setPrintingInvoiceId] = useState(null);
    const [legacyImportOpen, setLegacyImportOpen] = useState(false);

    useEffect(() => {
        if (!branchLocationsLoaded) {
            fetchLocations({ scope: hasAnyRole('admin') ? 'all' : 'mine' });
        }
    }, [branchLocationsLoaded, fetchLocations, hasAnyRole]);

    /** Danh sách hóa đơn cần một cơ sở cụ thể — đồng bộ khi navbar để «Tất cả» hoặc ID không còn trong danh sách được phân. */
    useEffect(() => {
        if (!locations.length) return;
        const inList = (id) => id && locations.some((l) => String(l._id) === String(id));
        if (currentLocationId === 'all' || !currentLocationId || !inList(currentLocationId)) {
            setCurrentLocationId(String(locations[0]._id));
        }
    }, [locations, currentLocationId, setCurrentLocationId]);

    const fetchOrders = async () => {
        const locId = currentLocationId && currentLocationId !== 'all' ? currentLocationId : null;
        if (!locId) {
            setOrders([]);
            return;
        }
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, locationId: locId };
            if (filters.status) params.status = filters.status;
            if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
            if (filters.legacy === 'only') params.isLegacyImport = 'true';
            if (filters.legacy === 'exclude') params.isLegacyImport = 'false';
            if (filters.channel === 'online' || filters.channel === 'in_store') {
                params.channel = filters.channel;
            }
            if (type === 'pre-orders') params.isPreOrder = true;
            else if (type === 'invoices') params.isPreOrder = false;
            if (type === 'returns') params.returnsOnly = true;
            const res = await getMyOrders(params);
            const data = res?.data;
            const pag = data?.pagination || {};
            setOrders(data?.orders || []);
            setPagination((p) => ({
                ...p,
                page: pag.page ?? p.page,
                total: pag.total ?? p.total,
                totalPages: Math.max(1, pag.totalPages ?? p.totalPages),
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [pagination.page, filters.status, filters.paymentStatus, filters.legacy, filters.channel, currentLocationId, type]);

    const handleUpdateStatus = async (orderId, field, value) => {
        setUpdatingId(orderId);
        try {
            const payload = field === 'status' ? { status: value } : { paymentStatus: value };
            const res = await updateOrder(orderId, payload);
            const warn = res?.data?.reservationWarning;
            if (warn) {
                toast.warning(String(warn).slice(0, 220) + (String(warn).length > 220 ? '…' : ''));
            } else {
                toast.success('Cập nhật thành công');
            }
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdatingId(null);
        }
    };

    const formatCustomer = (order) => {
        if (order?.customerProfile) {
            return order.customerProfile.name + (order.customerProfile.phone ? ` (${order.customerProfile.phone})` : '');
        }
        const c = order?.customer;
        if (!c) return '—';
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username;
        return name || c.email || '—';
    };

    const formatSeller = (order) => {
        const s = order?.createdBy;
        if (!s) return order?.channel === 'online' ? 'Web/khách tự đặt' : '—';
        return [s.firstName, s.lastName].filter(Boolean).join(' ') || s.username || '—';
    };

    const handleDeletePreOrder = async (order) => {
        if (!order?._id || type !== 'pre-orders') return;
        if (order.status === 'completed') {
            toast.error('Không xóa đơn đã hoàn thành');
            return;
        }
        if (!window.confirm(`Xóa hẳn đơn ${order.code}? Thao tác không hoàn tác tự phục hồi.`)) return;
        setDeletingId(order._id);
        try {
            await deletePreOrder(order._id);
            toast.success('Đã xóa đơn');
            fetchOrders();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không xóa được');
        } finally {
            setDeletingId(null);
        }
    };

    const handleViewPrintInvoice = async (order) => {
        if (!order?._id || (type !== 'invoices' && type !== 'returns')) return;
        setPrintingInvoiceId(order._id);
        try {
            await printVatInvoiceForOrderId(order._id);
        } catch (err) {
            toast.error(err?.message || err?.response?.data?.message || 'Không in được hóa đơn');
        } finally {
            setPrintingInvoiceId(null);
        }
    };

    const openPosPreOrderTab = () => {
        const locId =
            currentLocationId && currentLocationId !== 'all' && locations.some((l) => String(l._id) === String(currentLocationId))
                ? currentLocationId
                : locations[0]?._id;
        if (!locId) {
            toast.error('Chưa có cơ sở để gán — vui lòng tải lại hoặc kiểm tra phân quyền chi nhánh');
            return;
        }
        const url = `${window.location.origin}/sales?mode=order&locationId=${encodeURIComponent(String(locId))}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className='flex-1 p-6 bg-base-200 overflow-y-auto'>
            <div className='container mx-auto space-y-4'>
                <div className='flex flex-wrap items-start justify-between gap-3 gap-y-2'>
                    <h1 className='text-2xl font-bold text-base-content'>
                        {type === 'pre-orders'
                            ? 'Đặt hàng'
                            : type === 'invoices'
                              ? 'Hóa đơn'
                              : type === 'returns'
                                ? 'Trả hàng'
                                : 'Quản lý đơn hàng'}
                    </h1>
                    <div className='flex flex-wrap items-center gap-2'>
                        {type === 'pre-orders' && (
                            <button
                                type='button'
                                className='btn btn-primary btn-sm shrink-0 gap-2 rounded-xl shadow-sm sm:btn-md'
                                title='Mở Bán hàng (tab mới) ở chế độ đặt hàng — đồng bộ cơ sở đang lọc'
                                onClick={openPosPreOrderTab}
                                disabled={!locations.length}
                            >
                                <ShoppingCart className='h-4 w-4' />
                                Đặt hàng
                            </button>
                        )}
                        {type === 'invoices' && canImportLegacy && (
                            <button
                                type='button'
                                className='btn btn-primary btn-sm shrink-0 gap-2 rounded-xl shadow-sm sm:btn-md'
                                title='Ghi nhận hóa đơn / chứng từ giấy từ trước (số hóa) — chỉ ghi vào chi nhánh bạn được phân'
                                onClick={() => setLegacyImportOpen(true)}
                                disabled={!locations.length}
                            >
                                <FileStack className='h-4 w-4' />
                                Nhập hóa đơn
                            </button>
                        )}
                    </div>
                </div>

                {type === 'returns' && (
                    <div className='rounded-xl border border-base-300/70 bg-base-100 px-4 py-3 text-sm text-base-content/75 shadow-sm'>
                        <p className='font-medium text-base-content'>Đơn cần xử lý trả / hoàn tiền</p>
                        <p className='mt-1 leading-relaxed'>
                            Danh sách gồm đơn <strong>đã hủy</strong> nhưng <strong>khách đã thanh toán</strong> (chờ hoàn tiền) và đơn{' '}
                            <strong>đã hoàn tiền</strong>. Mở chi tiết để tạo VietQR hoàn tiền hoặc xác nhận đã chuyển khoản.
                        </p>
                    </div>
                )}

                <div className='flex w-full flex-wrap items-end justify-between gap-x-4 gap-y-3'>
                    <FilterToolbar className='min-w-0 flex-1'>
                        <FilterToolbarField label='Cơ sở'>
                            <select
                                className='select select-bordered select-sm w-48 max-w-full'
                                value={
                                    currentLocationId && currentLocationId !== 'all' && locations.some((l) => String(l._id) === String(currentLocationId))
                                        ? currentLocationId
                                        : locations[0]?._id || ''
                                }
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCurrentLocationId(v || null);
                                }}
                                disabled={locations.length <= 1}
                                title={
                                    locations.length <= 1
                                        ? 'Bạn chỉ được phân một chi nhánh — không đổi cơ sở tại đây.'
                                        : 'Chỉ các chi nhánh bạn được phân công (admin: mọi cơ sở). Đồng bộ với cơ sở trên thanh điều hướng.'
                                }
                            >
                                {locations.length === 0 ? (
                                    <option value=''>Đang tải chi nhánh…</option>
                                ) : (
                                    locations.map((loc) => (
                                        <option key={loc._id} value={loc._id}>
                                            {loc.name || loc.code}
                                        </option>
                                    ))
                                )}
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label='Trạng thái'>
                            <select
                                className='select select-bordered select-sm w-40 max-w-full'
                                value={filters.status}
                                onChange={(e) => {
                                    setFilters((f) => ({ ...f, status: e.target.value }));
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            >
                                <option value=''>Tất cả trạng thái</option>
                                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label='Thanh toán'>
                            <select
                                className='select select-bordered select-sm w-40 max-w-full'
                                value={filters.paymentStatus}
                                onChange={(e) => {
                                    setFilters((f) => ({ ...f, paymentStatus: e.target.value }));
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            >
                                <option value=''>Tất cả thanh toán</option>
                                {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label='Loại đơn'>
                            <select
                                className='select select-bordered select-sm w-44 max-w-full'
                                value={filters.channel}
                                onChange={(e) => {
                                    setFilters((f) => ({ ...f, channel: e.target.value }));
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            >
                                <option value=''>Tất cả</option>
                                {Object.entries(ORDER_TYPE_LABELS).map(([v, l]) => (
                                    <option key={v} value={v}>
                                        {l}
                                    </option>
                                ))}
                            </select>
                        </FilterToolbarField>
                        {type === 'invoices' && (
                            <FilterToolbarField label='Chứng từ cũ'>
                                <select
                                    className='select select-bordered select-sm w-44 max-w-full'
                                    value={filters.legacy}
                                    onChange={(e) => {
                                        setFilters((f) => ({ ...f, legacy: e.target.value }));
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                >
                                    <option value=''>Mọi hóa đơn</option>
                                    <option value='only'>Chỉ chứng từ cũ</option>
                                    <option value='exclude'>Loại trừ chứng từ cũ</option>
                                </select>
                            </FilterToolbarField>
                        )}
                    </FilterToolbar>
                </div>

                <div className='rounded-2xl border border-base-300/60 bg-base-100 shadow-sm overflow-hidden ring-1 ring-black/3'>
                    {loading ? (
                        <div className='flex justify-center py-16'>
                            <span className='loading loading-spinner loading-lg text-primary' />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className='p-14 text-center text-base-content/55 text-sm'>
                            {!currentLocationId || currentLocationId === 'all'
                                ? 'Vui lòng chọn cơ sở'
                                : type === 'returns'
                                  ? 'Không có đơn chờ hoàn tiền / đã hoàn tiền tại cơ sở này.'
                                  : 'Chưa có đơn hàng nào tại cơ sở này'}
                        </div>
                    ) : (
                        <>
                            <div className='overflow-x-auto overflow-y-auto max-h-[700px]'>
                                <table className='table table-pin-rows w-full min-w-[920px]'>
                                    <thead className='sticky top-0 z-20 bg-base-200/95 backdrop-blur-md border-b border-base-300/80'>
                                        <tr className='text-[11px] font-semibold uppercase tracking-wider text-base-content/50'>
                                            <th className='w-10 py-3.5 bg-transparent' />
                                            <th className='py-3.5 bg-transparent font-semibold'>Mã đơn</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>Loại</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>Khách</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>Chi nhánh</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>NV bán</th>
                                            <th className='py-3.5 bg-transparent font-semibold text-end'>Tổng</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>Trạng thái</th>
                                            <th className='py-3.5 bg-transparent font-semibold'>TT</th>
                                            <th className='py-3.5 bg-transparent font-semibold whitespace-nowrap'>Ngày</th>
                                        </tr>
                                    </thead>
                                    <tbody className='text-[13px]'>
                                        {orders.map((order) => {
                                            const isExpanded = expandedId === order._id;
                                            const invoiceRollup = isExpanded ? computeOrderInvoiceRollup(order) : null;
                                            return (
                                                <React.Fragment key={order._id}>
                                                    <tr
                                                        className={`cursor-pointer border-b border-base-200/70 transition-colors hover:bg-base-200/40 ${
                                                            isExpanded ? 'bg-primary/6' : ''
                                                        }`}
                                                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                                                    >
                                                        <td
                                                            className={`w-10 py-3.5 align-middle ${isExpanded ? 'border-l-[3px] border-l-primary' : ''}`}
                                                        >
                                                            <span className='inline-flex h-8 w-8 items-center justify-center rounded-lg bg-base-200/70 text-base-content/60'>
                                                                {isExpanded ? (
                                                                    <ChevronDown className='h-4 w-4' />
                                                                ) : (
                                                                    <ChevronRight className='h-4 w-4' />
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className='py-3.5 align-middle'>
                                                            <div className='flex flex-wrap items-center gap-1.5'>
                                                                <span className='font-mono text-sm font-semibold tracking-tight text-base-content'>
                                                                    {order.code}
                                                                </span>
                                                                {order.isPreOrder && (
                                                                    <span className='badge badge-sm border-0 bg-violet-500/15 text-violet-800 dark:text-violet-200'>
                                                                        Đặt trước
                                                                    </span>
                                                                )}
                                                                {order.isLegacyImport && (
                                                                    <span className='badge badge-sm border-0 bg-amber-500/15 text-amber-900 dark:text-amber-200 whitespace-nowrap'>
                                                                        Chứng từ cũ
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className='py-3.5 align-middle'>
                                                            <span className='inline-flex rounded-full border border-base-300/80 bg-base-200/50 px-2.5 py-0.5 text-xs font-medium text-base-content/80 whitespace-nowrap'>
                                                                {ORDER_TYPE_LABELS[order.channel] || order.channel || '—'}
                                                            </span>
                                                        </td>
                                                        <td className='py-3.5 align-middle max-w-[200px] truncate text-base-content/90' title={formatCustomer(order)}>
                                                            {formatCustomer(order)}
                                                        </td>
                                                        <td className='py-3.5 align-middle text-base-content/80'>{order.location?.name || '—'}</td>
                                                        <td className='py-3.5 align-middle text-base-content/80'>{formatSeller(order)}</td>
                                                        <td className='py-3.5 align-middle text-end font-semibold tabular-nums text-primary'>
                                                            {(order.totalAmount || 0).toLocaleString('vi-VN')}đ
                                                        </td>
                                                        <td className='py-3.5 align-middle' onClick={(e) => e.stopPropagation()}>
                                                            {order.status === 'completed' ? (
                                                                <span
                                                                    className={`inline-flex max-w-44 items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-tight ${getStatusSelectClass('completed')}`}
                                                                    title='Chỉ kho (quét xuất) hoặc hoàn tất POS mới đặt trạng thái này'
                                                                >
                                                                    {STATUS_LABELS.completed}
                                                                </span>
                                                            ) : (
                                                                <select
                                                                    className={`select select-bordered select-sm h-9 min-h-9 max-w-44 border font-medium text-xs ${getStatusSelectClass(order.status)}`}
                                                                    value={STATUS_LABELS[order.status] ? order.status : 'pending'}
                                                                    onChange={(e) => handleUpdateStatus(order._id, 'status', e.target.value)}
                                                                    disabled={updatingId === order._id}
                                                                >
                                                                    {STATUS_MANUAL_SELECT_KEYS.map((v) => (
                                                                        <option key={v} value={v}>
                                                                            {STATUS_LABELS[v]}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className='py-3.5 align-middle' onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                className={`select select-bordered select-sm h-9 min-h-9 max-w-38 border font-medium text-xs ${getPaymentSelectClass(order.paymentStatus)}`}
                                                                value={order.paymentStatus || 'pending'}
                                                                onChange={(e) => handleUpdateStatus(order._id, 'paymentStatus', e.target.value)}
                                                                disabled={updatingId === order._id}
                                                            >
                                                                {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                                                    <option key={v} value={v}>
                                                                        {l}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className='py-3.5 align-middle text-xs text-base-content/60 whitespace-nowrap'>
                                                            {order.documentDate || order.createdAt ? (
                                                                <>
                                                                    <span>
                                                                        {new Date(order.documentDate || order.createdAt).toLocaleString('vi-VN')}
                                                                    </span>
                                                                    {order.isLegacyImport && order.documentDate && order.createdAt && (
                                                                        <span className='mt-1 block text-[10px] text-base-content/45'>
                                                                            Nhập máy: {new Date(order.createdAt).toLocaleString('vi-VN')}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                '—'
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <tr key={`${order._id}-detail`} className='border-b border-base-200/80 bg-linear-to-b from-base-200/25 to-base-100'>
                                                            <td colSpan={10} className='p-3 sm:p-4 align-top' onClick={(e) => e.stopPropagation()}>
                                                                <div className='rounded-xl border border-base-300/70 bg-base-100 p-4 sm:p-5 shadow-sm'>
                                                                    <div className='grid gap-6 sm:grid-cols-2'>
                                                                        <div className='space-y-4'>
                                                                            <InfoRow icon={User} label='Khách hàng'>
                                                                                {formatCustomer(order)}
                                                                            </InfoRow>
                                                                            <InfoRow icon={Store} label='Chi nhánh'>
                                                                                {order.location?.name || '—'}
                                                                            </InfoRow>
                                                                            <InfoRow icon={UserCircle} label='Nhân viên bán'>
                                                                                {formatSeller(order)}
                                                                            </InfoRow>
                                                                            <InfoRow icon={MapPin} label='Địa chỉ giao hàng'>
                                                                                {order.shippingAddress || '—'}
                                                                            </InfoRow>
                                                                            {order.shippingPhone ? (
                                                                                <InfoRow icon={User} label='SĐT nhận hàng'>
                                                                                    {order.shippingPhone}
                                                                                </InfoRow>
                                                                            ) : null}
                                                                            {order.isLegacyImport && order.legacyPaperCode ? (
                                                                                <InfoRow icon={FileStack} label='Số trên giấy'>
                                                                                    {order.legacyPaperCode}
                                                                                </InfoRow>
                                                                            ) : null}
                                                                            {order.note ? (
                                                                                <div className='rounded-lg border border-dashed border-base-300/80 bg-base-200/30 px-3 py-2.5 text-sm text-base-content/85'>
                                                                                    <span className='text-xs font-semibold uppercase tracking-wide text-base-content/45'>
                                                                                        Ghi chú
                                                                                    </span>
                                                                                    <p className='mt-1 leading-relaxed'>{order.note}</p>
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                        <div className='flex flex-col'>
                                                                            <div className='flex items-center gap-2 text-sm font-semibold text-base-content'>
                                                                                <Package className='h-4 w-4 text-primary' aria-hidden />
                                                                                Chi tiết sản phẩm
                                                                            </div>
                                                                            <div className='mt-3 flex-1 overflow-hidden rounded-xl border border-base-200 bg-base-200/20'>
                                                                                <ul className='divide-y divide-base-200/90'>
                                                                                    {order.items?.map((item, idx) => {
                                                                                        const net =
                                                                                            (Number(item.quantity) || 0) * (Number(item.price) || 0);
                                                                                        const declared =
                                                                                            item.total != null && item.total !== ''
                                                                                                ? Number(item.total)
                                                                                                : null;
                                                                                        const lineGross =
                                                                                            Number.isFinite(declared) && declared >= 0
                                                                                                ? declared
                                                                                                : net;
                                                                                        const vatPct =
                                                                                            item.vatPercent != null && item.vatPercent !== ''
                                                                                                ? Number(item.vatPercent)
                                                                                                : null;
                                                                                        return (
                                                                                            <li
                                                                                                key={idx}
                                                                                                className='grid grid-cols-1 gap-1 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4'
                                                                                            >
                                                                                                <span className='min-w-0 text-sm text-base-content/90'>
                                                                                                    <span className='font-medium text-base-content'>
                                                                                                        {item.product?.name || 'Sản phẩm'}
                                                                                                    </span>
                                                                                                    <span className='text-base-content/55'>
                                                                                                        {' '}
                                                                                                        × {item.quantity}
                                                                                                        {item.unit ? ` ${item.unit}` : ''}
                                                                                                        {Number(vatPct) > 0 ? (
                                                                                                            <span className='text-base-content/45'>
                                                                                                                {' '}
                                                                                                                · VAT {vatPct}%
                                                                                                            </span>
                                                                                                        ) : null}
                                                                                                    </span>
                                                                                                </span>
                                                                                                <span className='text-sm font-semibold tabular-nums text-base-content sm:text-end'>
                                                                                                    {lineGross.toLocaleString('vi-VN')}đ
                                                                                                </span>
                                                                                            </li>
                                                                                        );
                                                                                    })}
                                                                                </ul>
                                                                                {invoiceRollup ? (
                                                                                    <div className='space-y-1 border-t border-base-200/90 bg-base-100/90 px-3 py-2.5 text-xs text-base-content/80'>
                                                                                        <div className='flex justify-between gap-3'>
                                                                                            <span>Tiền hàng (chưa thuế)</span>
                                                                                            <span className='shrink-0 font-medium tabular-nums'>
                                                                                                {invoiceRollup.netSubtotal.toLocaleString('vi-VN')}đ
                                                                                            </span>
                                                                                        </div>
                                                                                        {invoiceRollup.vatTotal > 0 ? (
                                                                                            <>
                                                                                                <div className='flex justify-between gap-3'>
                                                                                                    <span>Thuế GTGT</span>
                                                                                                    <span className='shrink-0 font-medium tabular-nums'>
                                                                                                        {invoiceRollup.vatTotal.toLocaleString('vi-VN')}đ
                                                                                                    </span>
                                                                                                </div>
                                                                                                <div className='flex justify-between gap-3 border-b border-base-200/80 pb-1.5 text-[11px] text-base-content/55'>
                                                                                                    <span>Tạm tính (gồm thuế)</span>
                                                                                                    <span className='shrink-0 tabular-nums'>
                                                                                                        {invoiceRollup.grossBeforeDiscount.toLocaleString('vi-VN')}đ
                                                                                                    </span>
                                                                                                </div>
                                                                                            </>
                                                                                        ) : null}
                                                                                        {invoiceRollup.discount > 0 ? (
                                                                                            <div className='flex justify-between gap-3 text-emerald-700'>
                                                                                                <span>Chiết khấu</span>
                                                                                                <span className='shrink-0 font-medium tabular-nums'>
                                                                                                    −{invoiceRollup.discount.toLocaleString('vi-VN')}đ
                                                                                                </span>
                                                                                            </div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                ) : null}
                                                                                <div className='flex items-center justify-between border-t border-base-300/60 bg-primary/7 px-3 py-3'>
                                                                                    <span className='text-sm font-semibold text-base-content'>
                                                                                        Tổng thanh toán
                                                                                    </span>
                                                                                    <span className='text-lg font-bold tabular-nums text-primary'>
                                                                                        {(order.totalAmount || 0).toLocaleString('vi-VN')}đ
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {type === 'pre-orders' && (
                                                                        <div className='mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-base-200 pt-4'>
                                                                            <Link
                                                                                to={`/admin/orders/${order._id}`}
                                                                                className='btn btn-sm btn-ghost gap-1.5 rounded-xl border border-base-300/80'
                                                                            >
                                                                                <ExternalLink className='h-3.5 w-3.5' />
                                                                                Chi tiết / sửa
                                                                            </Link>
                                                                            {order.status !== 'completed' && (
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-sm btn-ghost text-error hover:bg-error/10 rounded-xl'
                                                                                    disabled={deletingId === order._id}
                                                                                    onClick={() => handleDeletePreOrder(order)}
                                                                                >
                                                                                    {deletingId === order._id ? (
                                                                                        <span className='loading loading-spinner loading-xs' />
                                                                                    ) : (
                                                                                        'Xóa'
                                                                                    )}
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    {(type === 'invoices' || type === 'returns') && (
                                                                        <div className='mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-base-200 pt-4'>
                                                                            <Link
                                                                                to={
                                                                                    type === 'returns'
                                                                                        ? `/admin/orders/${order._id}?returnTo=${encodeURIComponent('/admin/orders/returns')}`
                                                                                        : `/admin/orders/${order._id}`
                                                                                }
                                                                                className='btn btn-sm btn-ghost gap-1.5 rounded-xl border border-base-300/80'
                                                                            >
                                                                                <ExternalLink className='h-3.5 w-3.5' />
                                                                                {type === 'returns' ? 'Chi tiết & hoàn tiền' : 'Chi tiết đơn'}
                                                                            </Link>
                                                                            <button
                                                                                type='button'
                                                                                className='btn btn-sm btn-primary gap-1.5 rounded-xl shadow-sm'
                                                                                disabled={printingInvoiceId === order._id}
                                                                                onClick={() => handleViewPrintInvoice(order)}
                                                                            >
                                                                                {printingInvoiceId === order._id ? (
                                                                                    <span className='loading loading-spinner loading-xs' />
                                                                                ) : (
                                                                                    <Printer className='h-3.5 w-3.5' />
                                                                                )}
                                                                                {printingInvoiceId === order._id ? 'Đang mở in…' : 'Xem & in hóa đơn'}
                                                                            </button>
                                                                        </div>
                                                                    )}
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

                            <div className='flex flex-col gap-3 border-t border-base-200/90 bg-base-200/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between'>
                                <p className='text-sm text-base-content/55'>
                                    Hiển thị <span className='font-medium text-base-content'>{orders.length}</span> /{' '}
                                    <span className='font-medium text-base-content'>{pagination.total}</span> đơn
                                </p>
                                <div className='join border border-base-300/80 shadow-sm rounded-lg overflow-hidden'>
                                    <button
                                        type='button'
                                        className='join-item btn btn-sm btn-ghost bg-base-100'
                                        disabled={pagination.page <= 1}
                                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                    >
                                        <ChevronLeft className='w-4 h-4' />
                                    </button>
                                    <button type='button' className='join-item btn btn-sm btn-ghost bg-base-100 px-4' disabled>
                                        Trang {pagination.page} / {pagination.totalPages}
                                    </button>
                                    <button
                                        type='button'
                                        className='join-item btn btn-sm btn-ghost bg-base-100'
                                        disabled={pagination.page >= pagination.totalPages}
                                        onClick={() =>
                                            setPagination((p) => ({
                                                ...p,
                                                page: Math.min(p.totalPages, p.page + 1),
                                            }))
                                        }
                                    >
                                        <ChevronRight className='w-4 h-4' />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <LegacyInvoiceImportModal
                open={legacyImportOpen}
                onClose={() => setLegacyImportOpen(false)}
                locations={locations}
                defaultLocationId={
                    currentLocationId && currentLocationId !== 'all' ? currentLocationId : locations[0]?._id
                }
                onSuccess={fetchOrders}
            />
        </div>
    );
}
