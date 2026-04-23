import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
    getOrderById,
    updateOrder,
    syncPaymentStatus,
    confirmWarehouseOutbound,
    getRefundTransferQr,
    confirmRefundTransfer,
} from '@/services/orderService';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

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

const formatMoney = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

/** Khớp backend getRefundTransferQr: cần BIN ≥6 số và STK ≥6 số (số). */
function hasRefundBankForVietQr(order) {
    const bin = String(order?.refundBankBin || '').replace(/\D/g, '');
    const acc = String(order?.refundBankAccount || '').replace(/\D/g, '');
    return bin.length >= 6 && acc.length >= 6;
}

export default function AdminOrderDetailPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { hasAnyRole } = useUserRole();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [confirmingOutbound, setConfirmingOutbound] = useState(false);
    const [refundQrOpen, setRefundQrOpen] = useState(false);
    const [refundQrLoading, setRefundQrLoading] = useState(false);
    const [refundQrData, setRefundQrData] = useState(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);

    const canConfirmWarehouse = hasAnyRole('admin', 'manager', 'warehouse_manager');
    const canProcessRefund = hasAnyRole(
        'admin',
        'manager',
        'Quản lý chi nhánh',
        'seller',
        'staff',
        'Nhân viên bán hàng',
    );

    const backTo = useMemo(() => {
        const raw = (searchParams.get('returnTo') || '').trim();
        if (!raw) return null;
        try {
            const decoded = decodeURIComponent(raw);
            // only allow internal paths
            if (decoded.startsWith('/')) return decoded;
        } catch {
            // ignore
        }
        return null;
    }, [searchParams]);

    const fetchOrder = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getOrderById(id);
            setOrder(res?.data?.order);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tìm thấy đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleUpdate = async (field, value) => {
        if (!id) return;
        setUpdating(true);
        try {
            const payload = field === 'status' ? { status: value } : { paymentStatus: value };
            await updateOrder(id, payload);
            toast.success('Cập nhật thành công');
            fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi cập nhật');
        } finally {
            setUpdating(false);
        }
    };

    const handleSyncPayOS = async () => {
        if (!id) return;
        setSyncing(true);
        try {
            const res = await syncPaymentStatus(id);
            setOrder(res?.data?.order || order);
            toast.success('Đã đồng bộ trạng thái từ PayOS');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể đồng bộ từ PayOS');
        } finally {
            setSyncing(false);
        }
    };

    const handleConfirmWarehouseOutbound = async () => {
        if (!id) return;
        setConfirmingOutbound(true);
        try {
            const res = await confirmWarehouseOutbound(id, {});
            if (res.success) {
                setOrder(res?.data?.order || order);
                toast.success(res.message || 'Đã xác nhận xuất kho');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không xác nhận được xuất kho');
        } finally {
            setConfirmingOutbound(false);
        }
    };

    const handleOpenRefundQr = async () => {
        if (!id) return;
        setRefundQrLoading(true);
        setRefundQrData(null);
        try {
            const res = await getRefundTransferQr(id);
            const d = res?.data;
            if (d?.qrUrl) {
                setRefundQrData(d);
                setRefundQrOpen(true);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tạo được mã QR hoàn tiền');
        } finally {
            setRefundQrLoading(false);
        }
    };

    const handleConfirmRefundDone = async () => {
        if (!id) return;
        setConfirmingRefund(true);
        try {
            const res = await confirmRefundTransfer(id);
            if (res.success) {
                setOrder(res?.data?.order || order);
                toast.success(res.message || 'Đã cập nhật trạng thái hoàn tiền');
                setRefundQrOpen(false);
                setRefundQrData(null);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không cập nhật được trạng thái hoàn tiền');
        } finally {
            setConfirmingRefund(false);
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

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link
                        to={backTo || (order?.isPreOrder ? '/admin/orders/pre-orders' : '/admin/orders/invoices')}
                        className="btn btn-ghost btn-sm gap-1"
                    >
                        ← Quay lại
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : !order ? (
                    <div className="text-center py-12 text-base-content/60">
                        Không tìm thấy đơn hàng
                    </div>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold">
                            Đơn hàng {order.code}
                            {order.isPreOrder && (
                                <span className="ml-2 badge badge-ghost">Đặt trước</span>
                            )}
                        </h1>

                        <div className="bg-base-100 rounded-lg border border-base-300 p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Khách hàng</span>
                                <span>{formatCustomer(order)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Chi nhánh</span>
                                <span>{order.location?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Nhân viên bán</span>
                                <span>{formatSeller(order)}</span>
                            </div>
                            {order.channel === 'online' && (
                                <p className="text-xs text-base-content/60 bg-base-200/80 rounded-lg px-3 py-2">
                                    Luồng online: khách thanh toán xong vẫn &quot;Chờ xử lý&quot; — seller chuyển sang &quot;Đã xác nhận&quot; sau đó kho mới xuất hàng và trừ tồn.
                                </p>
                            )}
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Trạng thái</span>
                                <select
                                    className="select select-bordered select-sm"
                                    value={order.status && STATUS_LABELS[order.status] ? order.status : 'pending'}
                                    onChange={(e) => handleUpdate('status', e.target.value)}
                                    disabled={updating}
                                >
                                    {(order.channel === 'in_store'
                                        ? Object.entries(STATUS_LABELS).filter(([v]) => v !== 'confirmed')
                                        : Object.entries(STATUS_LABELS)
                                    ).map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                                <span className="text-base-content/70">Thanh toán</span>
                                <div className="flex items-center gap-1">
                                    <select
                                        className="select select-bordered select-sm"
                                        value={order.paymentStatus || 'pending'}
                                        onChange={(e) => handleUpdate('paymentStatus', e.target.value)}
                                        disabled={updating}
                                    >
                                        {Object.entries(PAYMENT_STATUS_LABELS).map(([v, l]) => (
                                            <option key={v} value={v}>{l}</option>
                                        ))}
                                    </select>
                                    {order.paymentStatus === 'pending' && ['vietqr', 'transfer'].includes(order.paymentMethod) && (
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            title="Đồng bộ trạng thái từ PayOS"
                                            onClick={handleSyncPayOS}
                                            disabled={syncing}
                                        >
                                            {syncing ? <span className="loading loading-spinner loading-sm" /> : '↻ Đồng bộ'}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-base-content/70">Địa chỉ giao hàng</span>
                                <span>{order.shippingAddress || '—'}</span>
                            </div>
                            {order.shippingPhone && (
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">SĐT nhận hàng</span>
                                    <span>{order.shippingPhone}</span>
                                </div>
                            )}
                            {order.note && (
                                <div className="flex justify-between">
                                    <span className="text-base-content/70">Ghi chú</span>
                                    <span>{order.note}</span>
                                </div>
                            )}
                            {/* Ẩn thông tin "Kho (online)" để UI báo cáo gọn và đồng bộ. */}
                            {canConfirmWarehouse &&
                                order.channel === 'online' &&
                                order.warehouseReservationActive === true &&
                                order.paymentStatus === 'paid' &&
                                order.status === 'confirmed' && (
                                    <div className="pt-3 mt-2 border-t border-base-200 space-y-2">
                                        <p className="text-sm font-medium text-base-content/80">Xác nhận xuất kho</p>
                                        <p className="text-xs text-base-content/60">
                                            Trước tiên quét từng sản phẩm đóng gói tại{' '}
                                            <Link to="/admin/warehouses/outbound-scan" className="link link-primary">
                                                Xuất kho nhanh
                                            </Link>
                                            . Chỉ khi đủ dòng hàng mới bấm xác nhận bên dưới để trừ tồn.
                                        </p>
                                        {Array.isArray(order.items) && order.items.length > 0 && (
                                            <p className="text-xs text-base-content/70">
                                                Đóng gói:{' '}
                                                <span className="font-medium">
                                                    {(order.warehousePackedLineIndexes || []).length}/{order.items.length} dòng
                                                </span>
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={confirmingOutbound}
                                            onClick={handleConfirmWarehouseOutbound}
                                        >
                                            {confirmingOutbound ? (
                                                <span className="loading loading-spinner loading-sm" />
                                            ) : (
                                                'Xác nhận đã xuất kho (sau khi quét đủ SP)'
                                            )}
                                        </button>
                                    </div>
                                )}
                            {order.status === 'cancelled' &&
                                (order.paymentStatus === 'paid' || order.paymentStatus === 'refunded') && (
                                    <div className="pt-2 mt-2 border-t border-base-300 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-base-content/80">
                                                Hoàn tiền cho khách (đơn đã hủy)
                                            </p>
                                            {order.paymentStatus === 'paid' && (
                                                <span className="badge badge-warning badge-sm">Chờ hoàn tiền</span>
                                            )}
                                            {order.paymentStatus === 'refunded' && (
                                                <span className="badge badge-success badge-sm">Đã hoàn tiền</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm rounded-lg bg-base-200/60 px-3 py-2">
                                            {order.refundBankName ||
                                            order.refundBankBin ||
                                            order.refundBankAccount ||
                                            order.refundAccountHolder ? (
                                                <>
                                                    {order.refundBankName && (
                                                        <p>
                                                            <span className="text-base-content/60">Ngân hàng:</span>{' '}
                                                            {order.refundBankName}
                                                        </p>
                                                    )}
                                                    {order.refundBankBin && (
                                                        <p>
                                                            <span className="text-base-content/60">Mã BIN:</span>{' '}
                                                            {order.refundBankBin}
                                                        </p>
                                                    )}
                                                    {order.refundBankAccount && (
                                                        <p>
                                                            <span className="text-base-content/60">Số TK:</span>{' '}
                                                            <span className="font-mono">{order.refundBankAccount}</span>
                                                        </p>
                                                    )}
                                                    {order.refundAccountHolder && (
                                                        <p>
                                                            <span className="text-base-content/60">Chủ TK:</span>{' '}
                                                            {order.refundAccountHolder}
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-warning text-sm">
                                                    Chưa có thông tin tài khoản nhận hoàn tiền trên đơn. Cần khách cung
                                                    cấp (hoặc cập nhật đơn) trước khi tạo VietQR.
                                                </p>
                                            )}
                                            <p>
                                                <span className="text-base-content/60">Số tiền hoàn:</span>{' '}
                                                <span className="font-semibold">
                                                    {(order.totalAmount || 0).toLocaleString('vi-VN')}đ
                                                </span>
                                            </p>
                                        </div>
                                        {canProcessRefund && order.paymentStatus === 'paid' && (
                                            <div className="space-y-2">
                                                {!hasRefundBankForVietQr(order) && (
                                                    <p className="text-xs text-warning">
                                                        Để mở mã QR VietQR cần đủ mã BIN ngân hàng (6 số) và số tài
                                                        khoản khách trên đơn.
                                                    </p>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    disabled={refundQrLoading || !hasRefundBankForVietQr(order)}
                                                    onClick={handleOpenRefundQr}
                                                >
                                                    {refundQrLoading ? (
                                                        <span className="loading loading-spinner loading-sm" />
                                                    ) : (
                                                        'Mở mã QR chuyển khoản hoàn tiền'
                                                    )}
                                                </button>
                                                <p className="text-xs text-base-content/60">
                                                    Quét QR bằng app ngân hàng của cửa hàng để chuyển đúng số tiền tới
                                                    tài khoản khách. Sau khi chuyển khoản thành công, bấm &quot;Xác nhận
                                                    đã hoàn tiền&quot; trong cửa sổ QR.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                        </div>

                        <div className="bg-base-100 rounded-lg border border-base-300 overflow-hidden">
                            <div className="px-4 py-3 font-semibold bg-base-200 border-b flex items-center justify-between gap-3">
                                <h2>Chi tiết sản phẩm</h2>
                                <span className="text-xs text-base-content/60">
                                    {Array.isArray(order.items) ? order.items.length : 0} dòng
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="table table-sm w-full">
                                    <thead className="bg-base-200/60">
                                        <tr>
                                            <th>Sản phẩm</th>
                                            <th className="text-right">SL</th>
                                            <th className="text-right">Đơn giá</th>
                                            <th className="text-right">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(order.items || []).map((item, idx) => {
                                            const p = item.product || {};
                                            const img = p.images?.[0] || p.image || '';
                                            const qty = Number(item.quantity || 0);
                                            const price = Number(item.price || 0);
                                            const lineTotal = qty * price;
                                            return (
                                                <tr key={idx}>
                                                    <td>
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-10 h-10 rounded-lg bg-base-200 shrink-0 overflow-hidden flex items-center justify-center">
                                                                {img ? (
                                                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs text-base-content/40">N/A</span>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium truncate">{p.name || 'Sản phẩm'}</div>
                                                                <div className="text-xs text-base-content/60 font-mono truncate">
                                                                    {p.sku ? `SKU ${p.sku}` : ''}
                                                                    {p.barcode ? ` · BC ${p.barcode}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-right font-medium">{qty}</td>
                                                    <td className="text-right">{formatMoney(price)}</td>
                                                    <td className="text-right font-semibold">{formatMoney(lineTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="px-4 py-3 bg-base-200 border-t space-y-1">
                                <div className="flex justify-between text-sm text-base-content/70">
                                    <span>Tạm tính</span>
                                    <span className="font-medium">
                                        {formatMoney(
                                            (order.items || []).reduce(
                                                (s, it) => s + Number(it.quantity || 0) * Number(it.price || 0),
                                                0
                                            )
                                        )}
                                    </span>
                                </div>
                                {Number(order.discount || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-700">
                                        <span>Chiết khấu</span>
                                        <span className="font-medium">- {formatMoney(order.discount || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg pt-1">
                                    <span>Tổng tiền</span>
                                    <span className="text-primary">{formatMoney(order.totalAmount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {refundQrOpen && refundQrData?.qrUrl && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-md">
                        <h3 className="font-bold text-lg mb-2">Chuyển khoản hoàn tiền cho khách</h3>
                        <p className="text-sm text-base-content/80 mb-1">
                            Số tiền:{' '}
                            <strong>{Number(refundQrData.amount || 0).toLocaleString('vi-VN')}đ</strong>
                            {refundQrData.orderCode ? ` — ${refundQrData.orderCode}` : ''}
                        </p>
                        <p className="text-xs text-base-content/60 mb-3">
                            {refundQrData.refundBankName} · STK{' '}
                            <span className="font-mono">{refundQrData.refundBankAccount}</span>
                            {refundQrData.refundAccountHolder ? ` · ${refundQrData.refundAccountHolder}` : ''}
                        </p>
                        <div className="flex justify-center mb-4">
                            <img
                                src={refundQrData.qrUrl}
                                alt="Mã QR chuyển khoản hoàn tiền"
                                className="w-56 h-56 object-contain rounded-lg border border-base-300 bg-white"
                            />
                        </div>
                        <p className="text-xs text-warning mb-4">
                            Chỉ bấm &quot;Xác nhận đã hoàn tiền&quot; sau khi bạn đã chuyển khoản thành công.
                        </p>
                        <div className="modal-action flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => {
                                    setRefundQrOpen(false);
                                    setRefundQrData(null);
                                }}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={confirmingRefund}
                                onClick={handleConfirmRefundDone}
                            >
                                {confirmingRefund ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    'Xác nhận đã hoàn tiền'
                                )}
                            </button>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                        onClick={() => {
                            setRefundQrOpen(false);
                            setRefundQrData(null);
                        }}
                    >
                        <button type="button">close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
