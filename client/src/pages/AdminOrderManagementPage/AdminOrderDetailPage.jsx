import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
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

export default function AdminOrderDetailPage() {
    const { id } = useParams();
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
    const canProcessRefund = hasAnyRole('admin', 'manager', 'seller');

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

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-2xl space-y-6">
                <div className="flex items-center justify-between">
                    <Link
                        to={order?.isPreOrder ? '/admin/orders/pre-orders' : '/admin/orders/invoices'}
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
                            {order.channel === 'online' && (
                                <div className="flex justify-between items-center gap-2 pt-2 border-t border-base-200">
                                    <span className="text-base-content/70">Kho (online)</span>
                                    <span className="text-sm">
                                        {order.warehouseReservationActive === true ? (
                                            <span className="badge badge-warning">Chờ xuất kho — tồn đang giữ chỗ</span>
                                        ) : (
                                            <span className="badge badge-success">Đã xuất kho (trạng thái đơn: hoàn thành)</span>
                                        )}
                                    </span>
                                </div>
                            )}
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
                                (order.refundBankName || order.refundBankAccount || order.refundAccountHolder) && (
                                    <div className="pt-2 mt-2 border-t border-base-300 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-medium text-base-content/80">
                                                Hoàn tiền (đơn đã thanh toán, khách đã hủy)
                                            </p>
                                            {order.paymentStatus === 'paid' && (
                                                <span className="badge badge-warning badge-sm">Chờ hoàn tiền</span>
                                            )}
                                            {order.paymentStatus === 'refunded' && (
                                                <span className="badge badge-success badge-sm">Đã hoàn tiền</span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm rounded-lg bg-base-200/60 px-3 py-2">
                                            {order.refundBankName && (
                                                <p>
                                                    <span className="text-base-content/60">Ngân hàng:</span>{' '}
                                                    {order.refundBankName}
                                                </p>
                                            )}
                                            {order.refundBankBin && (
                                                <p>
                                                    <span className="text-base-content/60">Mã BIN:</span> {order.refundBankBin}
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
                                                    <span className="text-base-content/60">Chủ TK:</span> {order.refundAccountHolder}
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
                                                <button
                                                    type="button"
                                                    className="btn btn-primary btn-sm"
                                                    disabled={refundQrLoading}
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
                            <h2 className="px-4 py-3 font-semibold bg-base-200 border-b">
                                Chi tiết sản phẩm
                            </h2>
                            <div className="divide-y divide-base-200">
                                {order.items?.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center px-4 py-3"
                                    >
                                        <div>
                                            <p className="font-medium">{item.product?.name || 'Sản phẩm'}</p>
                                            <p className="text-sm text-base-content/60">
                                                {item.quantity} x {(item.price || 0).toLocaleString()}đ
                                            </p>
                                        </div>
                                        <p className="font-medium">
                                            {((item.quantity || 0) * (item.price || 0)).toLocaleString()}đ
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 py-3 bg-base-200 border-t flex justify-between font-bold text-lg">
                                <span>Tổng tiền</span>
                                <span className="text-primary">
                                    {(order.totalAmount || 0).toLocaleString()}đ
                                </span>
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
