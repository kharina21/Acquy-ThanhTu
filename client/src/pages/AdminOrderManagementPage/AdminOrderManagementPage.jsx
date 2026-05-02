import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronLeft, ChevronRight, FileStack } from 'lucide-react';
import { useBranchStore } from '@/stores/useBranchStore';
import { getLocations } from '@/services/locationService';
import { getMyOrders, updateOrder, deletePreOrder } from '@/services/orderService';
import { printVatInvoiceForOrderId } from '@/lib/vatInvoicePrint';
import { toast } from 'sonner';
import { STATUS_CONFIG, PAYMENT_STATUS_CONFIG } from '@/components/order/StatusBadge';
import { useUserRole } from '@/hooks/useUserRole';
import LegacyInvoiceImportModal from './LegacyInvoiceImportModal';

const STATUS_LABELS = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận · chờ xuất kho',
    completed: 'Đã xuất kho / hoàn thành',
    cancelled: 'Đã hủy',
};

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

export default function AdminOrderManagementPage({ type = 'invoices' }) {
    const { hasAnyRole } = useUserRole();
    const canImportLegacy = hasAnyRole('admin', 'manager', 'Quản lý chi nhánh');
    const { currentLocationId, setCurrentLocationId } = useBranchStore();
    const [locations, setLocations] = useState([]);
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
        // scope=mine: admin thấy mọi cơ sở; quản lý / bán hàng / kho chỉ thấy chi nhánh gán (Employee) — theo getManagerAllowedLocationIds
        getLocations({ isActive: 'true', scope: 'mine' })
            .then((res) => setLocations(res?.data?.locations || []))
            .catch(() => setLocations([]));
    }, []);

    useEffect(() => {
        if (locations.length === 0) {
            if (currentLocationId) setCurrentLocationId(null);
            return;
        }
        const valid = locations.some((l) => String(l._id) === String(currentLocationId));
        if (!currentLocationId || !valid) {
            setCurrentLocationId(locations[0]._id);
        }
    }, [locations, currentLocationId, setCurrentLocationId]);

    const fetchOrders = async () => {
        if (!currentLocationId) {
            setOrders([]);
            return;
        }
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: pagination.limit, locationId: currentLocationId };
            if (filters.status) params.status = filters.status;
            if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
            if (filters.legacy === 'only') params.isLegacyImport = 'true';
            if (filters.legacy === 'exclude') params.isLegacyImport = 'false';
            if (filters.channel === 'online' || filters.channel === 'in_store') {
                params.channel = filters.channel;
            }
            if (type === 'pre-orders') params.isPreOrder = true;
            if (type === 'invoices') params.isPreOrder = false;
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
        if (!order?._id || type !== 'invoices') return;
        setPrintingInvoiceId(order._id);
        try {
            await printVatInvoiceForOrderId(order._id);
        } catch (err) {
            toast.error(err?.message || err?.response?.data?.message || 'Không in được hóa đơn');
        } finally {
            setPrintingInvoiceId(null);
        }
    };

    return (
        <div className='flex-1 p-6 bg-base-200 overflow-y-auto'>
            <div className='container mx-auto space-y-4'>
                <div>
                    <h1 className='text-2xl font-bold text-base-content'>{type === 'pre-orders' ? 'Đặt hàng' : type === 'invoices' ? 'Hóa đơn' : 'Quản lý đơn hàng'}</h1>
                    {type === 'invoices' && (
                        <p className='text-sm text-base-content/65 mt-1 max-w-3xl'>
                            Đơn online: sau khi khách thanh toán, seller chuyển sang &quot;Đã xác nhận&quot; thì kho xuất hàng. Bán tại quầy: sau khi tạo hóa đơn (đã thanh toán hoặc sau khi xác nhận chuyển khoản), kho quét xuất tương tự — trừ tồn thực tế khi xác nhận xuất kho.{' '}
                            <strong>Chứng từ cũ</strong> (số hóa trước khi dùng phần mềm): nút &quot;Nhập hóa đơn&quot; — ghi theo ngày trên giấy, không ảnh hưởng tồn kho hiện tại.
                        </p>
                    )}
                </div>

                <div className='flex flex-wrap gap-2 items-end justify-between w-full gap-y-3'>
                    <div className='flex flex-wrap gap-2 items-end'>
                    <div>
                        <label className='label py-0 text-xs'>Cơ sở</label>
                        <select
                            className='select select-bordered select-sm w-48'
                            value={currentLocationId || ''}
                            onChange={(e) => setCurrentLocationId(e.target.value || null)}
                            disabled={locations.length <= 1}
                            title={locations.length <= 1 ? 'Một cơ sở — theo dữ liệu hệ thống hoặc quyền tài khoản' : undefined}
                        >
                            <option value=''>-- Chọn cơ sở --</option>
                            {locations.map((loc) => (
                                <option
                                    key={loc._id}
                                    value={loc._id}
                                >
                                    {loc.name || loc.code}
                                </option>
                            ))}
                        </select>
                    </div>
                    <select
                        className='select select-bordered select-sm w-40'
                        value={filters.status}
                        onChange={(e) => {
                            setFilters((f) => ({ ...f, status: e.target.value }));
                            setPagination((p) => ({ ...p, page: 1 }));
                        }}
                    >
                        <option value=''>Tất cả trạng thái</option>
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                            <option
                                key={v}
                                value={v}
                            >
                                {l}
                            </option>
                        ))}
                    </select>
                    <select
                        className='select select-bordered select-sm w-40'
                        value={filters.paymentStatus}
                        onChange={(e) => {
                            setFilters((f) => ({ ...f, paymentStatus: e.target.value }));
                            setPagination((p) => ({ ...p, page: 1 }));
                        }}
                    >
                        <option value=''>Tất cả thanh toán</option>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                            <option
                                key={v}
                                value={v}
                            >
                                {l}
                            </option>
                        ))}
                    </select>
                    <div>
                        <label className='label py-0 text-xs'>Loại đơn</label>
                        <select
                            className='select select-bordered select-sm w-44'
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
                    </div>
                    {type === 'invoices' && (
                        <select
                            className='select select-bordered select-sm w-44'
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
                    )}
                    </div>
                    {type === 'invoices' && canImportLegacy && (
                        <button
                            type='button'
                            className='btn btn-primary btn-sm gap-1.5 shrink-0'
                            title='Ghi nhận hóa đơn / chứng từ giấy từ trước (số hóa)'
                            onClick={() => setLegacyImportOpen(true)}
                        >
                            <FileStack className='w-4 h-4' />
                            Nhập hóa đơn
                        </button>
                    )}
                </div>

                <div className='bg-base-100 rounded-lg shadow-lg'>
                    {loading ? (
                        <div className='flex justify-center py-12'>
                            <span className='loading loading-spinner loading-lg text-primary' />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className='p-12 text-center text-base-content/60'>{!currentLocationId ? 'Vui lòng chọn cơ sở' : 'Chưa có đơn hàng nào tại cơ sở này'}</div>
                    ) : (
                        <>
                            <div className='overflow-x-auto overflow-y-auto max-h-[700px]'>
                                <table className='table'>
                                    <thead className='bg-blue-100 sticky top-0 z-20 border-b-2 border-base-300'>
                                        <tr>
                                            <th className='w-8 py-3'></th>
                                            <th className='font-medium text-neutral text-xs py-3'>Mã đơn</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Loại đơn</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Khách hàng</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Chi nhánh</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Nhân viên bán</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Tổng tiền</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Trạng thái</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Thanh toán</th>
                                            <th className='font-medium text-neutral text-xs py-3'>Ngày (CT / tạo)</th>
                                        </tr>
                                    </thead>
                                    <tbody className='text-xs'>
                                        {orders.map((order) => {
                                            const isExpanded = expandedId === order._id;
                                            return (
                                                <React.Fragment key={order._id}>
                                                    <tr
                                                        className={`cursor-pointer hover:bg-base-200/60 transition-colors font-light ${isExpanded ? 'bg-primary/10' : ''}`}
                                                        onClick={() => setExpandedId(isExpanded ? null : order._id)}
                                                    >
                                                        <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                                            {isExpanded ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
                                                        </td>
                                                        <td className='py-3'>
                                                            <span className='font-mono font-medium'>{order.code}</span>
                                                            {order.isPreOrder && <span className='ml-1 badge badge-sm badge-ghost'>Đặt trước</span>}
                                                            {order.isLegacyImport && (
                                                                <span className='ml-1 badge badge-sm badge-warning whitespace-nowrap'>Chứng từ cũ</span>
                                                            )}
                                                        </td>
                                                        <td className='py-3'>
                                                            <span className='badge badge-sm badge-ghost whitespace-nowrap'>
                                                                {ORDER_TYPE_LABELS[order.channel] || order.channel || '—'}
                                                            </span>
                                                        </td>
                                                        <td className='py-3'>{formatCustomer(order)}</td>
                                                        <td className='py-3'>{order.location?.name || '—'}</td>
                                                        <td className='py-3'>{formatSeller(order)}</td>
                                                        <td className='font-semibold text-primary py-3'>{(order.totalAmount || 0).toLocaleString()}đ</td>
                                                        <td onClick={(e) => e.stopPropagation()}>
                                                            <select
                                                                className={`select select-bordered select-sm border-2 font-medium ${getStatusSelectClass(order.status)}`}
                                                                value={STATUS_LABELS[order.status] ? order.status : 'pending'}
                                                                onChange={(e) => handleUpdateStatus(order._id, 'status', e.target.value)}
                                                                disabled={updatingId === order._id}
                                                            >
                                                                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                                                                    <option
                                                                        key={v}
                                                                        value={v}
                                                                    >
                                                                        {l}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td
                                                            className='py-3'
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <select
                                                                className={`select select-bordered select-sm border-2 font-medium ${getPaymentSelectClass(order.paymentStatus)}`}
                                                                value={order.paymentStatus || 'pending'}
                                                                onChange={(e) => handleUpdateStatus(order._id, 'paymentStatus', e.target.value)}
                                                                disabled={updatingId === order._id}
                                                            >
                                                                {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                                                    <option
                                                                        key={v}
                                                                        value={v}
                                                                    >
                                                                        {l}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className='text-base-content/70 py-3'>
                                                            {order.documentDate || order.createdAt ? (
                                                                <>
                                                                    <span>
                                                                        {new Date(order.documentDate || order.createdAt).toLocaleString('vi-VN')}
                                                                    </span>
                                                                    {order.isLegacyImport && order.documentDate && order.createdAt && (
                                                                        <span className='block text-[10px] text-base-content/50 mt-0.5'>
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
                                                        <tr
                                                            key={`${order._id}-detail`}
                                                            className='bg-primary/5 border-b-2 border-base-300'
                                                        >
                                                            <td
                                                                colSpan={10}
                                                                className='p-4 border-l-4 border-l-primary align-top'
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                                                    <div className='space-y-2'>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Khách hàng:</span> {formatCustomer(order)}
                                                                        </p>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Chi nhánh:</span> {order.location?.name || '—'}
                                                                        </p>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Nhân viên bán:</span> {formatSeller(order)}
                                                                        </p>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Địa chỉ giao hàng:</span>{' '}
                                                                            {order.shippingAddress || '—'}
                                                                        </p>
                                                                        {order.shippingPhone && (
                                                                            <p>
                                                                                <span className='font-medium text-base-content/70'>SĐT nhận hàng:</span> {order.shippingPhone}
                                                                            </p>
                                                                        )}
                                                                        {order.isLegacyImport && order.legacyPaperCode && (
                                                                            <p>
                                                                                <span className='font-medium text-base-content/70'>Số trên giấy:</span>{' '}
                                                                                {order.legacyPaperCode}
                                                                            </p>
                                                                        )}
                                                                        {order.note && (
                                                                            <p>
                                                                                <span className='font-medium text-base-content/70'>Ghi chú:</span> {order.note}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className='space-y-2'>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Trạng thái:</span>{' '}
                                                                            <span
                                                                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusSelectClass(order.status)}`}
                                                                            >
                                                                                {STATUS_LABELS[order.status] || order.status}
                                                                            </span>
                                                                        </p>
                                                                        <p>
                                                                            <span className='font-medium text-base-content/70'>Thanh toán:</span>{' '}
                                                                            <span
                                                                                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getPaymentSelectClass(order.paymentStatus)}`}
                                                                            >
                                                                                {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                                                                            </span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className='mt-4 pt-4 border-t border-base-200'>
                                                                    <p className='font-medium text-base-content/70 mb-2'>Chi tiết sản phẩm</p>
                                                                    <div className='divide-y divide-base-200'>
                                                                        {order.items?.map((item, idx) => (
                                                                            <div
                                                                                key={idx}
                                                                                className='flex justify-between py-2'
                                                                            >
                                                                                <span>
                                                                                    {item.product?.name || 'Sản phẩm'} × {item.quantity}{' '}
                                                                                    {item.unit ? `(${item.unit})` : ''}
                                                                                </span>
                                                                                <span className='font-medium'>{((item.quantity || 0) * (item.price || 0)).toLocaleString()}đ</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className='flex justify-between font-bold text-primary pt-2 mt-2 border-t border-base-200'>
                                                                        <span>Tổng tiền</span>
                                                                        <span>{(order.totalAmount || 0).toLocaleString()}đ</span>
                                                                    </div>
                                                                    {type === 'pre-orders' && (
                                                                        <div className='flex flex-wrap items-center justify-end gap-2 pt-3 mt-1 border-t border-base-200/80'>
                                                                            <Link
                                                                                to={`/admin/orders/${order._id}`}
                                                                                className='link link-hover text-xs font-medium text-base-content'
                                                                            >
                                                                                Chi tiết / sửa
                                                                            </Link>
                                                                            {order.status !== 'completed' && (
                                                                                <button
                                                                                    type='button'
                                                                                    className='link text-xs text-error no-underline hover:underline p-0 h-auto min-h-0'
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
                                                                    {type === 'invoices' && (
                                                                        <div className='flex flex-wrap items-center justify-end gap-3 pt-3 mt-1 border-t border-base-200/80'>
                                                                            <Link
                                                                                to={`/admin/orders/${order._id}`}
                                                                                className='link link-hover text-xs font-medium text-base-content'
                                                                            >
                                                                                Chi tiết đơn
                                                                            </Link>
                                                                            <button
                                                                                type='button'
                                                                                className='btn btn-sm btn-outline btn-primary gap-1'
                                                                                disabled={printingInvoiceId === order._id}
                                                                                onClick={() => handleViewPrintInvoice(order)}
                                                                            >
                                                                                {printingInvoiceId === order._id ? (
                                                                                    <span className='loading loading-spinner loading-xs' />
                                                                                ) : null}
                                                                                {printingInvoiceId === order._id
                                                                                    ? 'Đang mở in…'
                                                                                    : 'Xem & in hóa đơn'}
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

                            <div className='flex justify-between items-center p-4 border-t border-base-200'>
                                <p className='text-sm text-base-content/60'>
                                    Hiển thị {orders.length} / {pagination.total} đơn hàng
                                </p>
                                <div className='join'>
                                    <button
                                        type='button'
                                        className='join-item btn btn-sm'
                                        disabled={pagination.page <= 1}
                                        onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                    >
                                        <ChevronLeft className='w-4 h-4' />
                                    </button>
                                    <button
                                        type='button'
                                        className='join-item btn btn-sm'
                                        disabled
                                    >
                                        Trang {pagination.page} / {pagination.totalPages}
                                    </button>
                                    <button
                                        type='button'
                                        className='join-item btn btn-sm'
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
                defaultLocationId={currentLocationId}
                onSuccess={fetchOrders}
            />
        </div>
    );
}
