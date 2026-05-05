import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
    getOrderById,
    updateOrder,
    updatePreOrder,
    deletePreOrder,
    syncPaymentStatus,
    confirmWarehouseOutbound,
    confirmWarehouseItemsPrepared,
    getRefundTransferQr,
    confirmRefundTransfer,
} from '@/services/orderService';
import { getProducts } from '@/services/productService';
import { getActiveLocations } from '@/services/locationService';
import { searchCustomersByPhone } from '@/services/customerService';
import { getProductStocks } from '@/services/productStockService';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import {
    ArrowLeft,
    User,
    Building2,
    UserCircle,
    Truck,
    FileText,
    Banknote,
    Package,
    Layers,
} from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Chờ xử lý',
    confirmed: 'Đã xác nhận · chờ xuất kho',
    completed: 'Đã xuất kho / hoàn thành',
    cancelled: 'Đã hủy',
};

/** Không gán «hoàn thành» tay — chỉ kho / POS. */
const STATUS_MANUAL_SELECT_KEYS = ['pending', 'confirmed', 'cancelled'];

const PAYMENT_STATUS_LABELS = {
    pending: 'Chờ thanh toán',
    paid: 'Đã thanh toán',
    failed: 'Thất bại',
    refunded: 'Đã hoàn tiền',
};

const formatMoney = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

function DetailMetaRow({ icon: Icon, label, children }) {
    return (
        <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 border-b border-base-200/70 last:border-0 last:pb-0 first:pt-0">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45 flex items-center gap-2 shrink-0">
                {Icon ? <Icon className="size-3.5 opacity-80" aria-hidden /> : null}
                {label}
            </span>
            <div className="text-sm font-medium text-base-content sm:text-right sm:max-w-[min(100%,20rem)] wrap-break-word">
                {children}
            </div>
        </div>
    );
}

/** Khớp backend getRefundTransferQr: cần BIN ≥6 số và STK ≥6 số (số). */
function hasRefundBankForVietQr(order) {
    const bin = String(order?.refundBankBin || '').replace(/\D/g, '');
    const acc = String(order?.refundBankAccount || '').replace(/\D/g, '');
    return bin.length >= 6 && acc.length >= 6;
}

export default function AdminOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { hasAnyRole } = useUserRole();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [confirmingOutbound, setConfirmingOutbound] = useState(false);
    const [confirmingPrepared, setConfirmingPrepared] = useState(false);
    const [refundQrOpen, setRefundQrOpen] = useState(false);
    const [refundQrLoading, setRefundQrLoading] = useState(false);
    const [refundQrData, setRefundQrData] = useState(null);
    const [confirmingRefund, setConfirmingRefund] = useState(false);

    const [preOrderEditOpen, setPreOrderEditOpen] = useState(false);
    const [preOrderLines, setPreOrderLines] = useState([]);
    const [preOrderNote, setPreOrderNote] = useState('');
    const [preOrderDiscount, setPreOrderDiscount] = useState('0');
    const [preOrderLocationId, setPreOrderLocationId] = useState('');
    const [preOrderCustomerId, setPreOrderCustomerId] = useState('');
    const [locations, setLocations] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [productHits, setProductHits] = useState([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerHits, setCustomerHits] = useState([]);
    const [savingPreOrder, setSavingPreOrder] = useState(false);
    const [deletingPreOrder, setDeletingPreOrder] = useState(false);
    const [invoiceNoteOpen, setInvoiceNoteOpen] = useState(false);
    const [invoiceNoteDraft, setInvoiceNoteDraft] = useState('');
    const [savingInvoiceNote, setSavingInvoiceNote] = useState(false);
    /** Tồn tại chi nhánh đơn — snapshot hiện tại (productId string → { qty, reserved, avail }). */
    const [branchStockMap, setBranchStockMap] = useState({});

    const canConfirmWarehouse = hasAnyRole('admin', 'manager', 'warehouse_manager');
    const canManageInvoice = hasAnyRole(
        'admin',
        'manager',
        'seller',
        'Quản lý chi nhánh',
        'staff',
        'Nhân viên bán hàng',
    );
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

    useEffect(() => {
        const locId = order?.location?._id ?? order?.location;
        if (!locId) {
            setBranchStockMap({});
            return;
        }
        let cancelled = false;
        getProductStocks({ locationId: locId })
            .then((res) => {
                if (cancelled) return;
                const map = {};
                (res?.data?.stocks || []).forEach((s) => {
                    const raw = s.product?._id ?? s.product;
                    const pid = raw != null ? String(raw) : '';
                    if (!pid) return;
                    const q = Number(s.quantity) || 0;
                    const r = Number(s.reservedOnlineQty) || 0;
                    map[pid] = { qty: q, reserved: r, avail: Math.max(0, q - r) };
                });
                setBranchStockMap(map);
            })
            .catch(() => {
                if (!cancelled) setBranchStockMap({});
            });
        return () => {
            cancelled = true;
        };
    }, [order?.location, order?._id]);

    useEffect(() => {
        getActiveLocations()
            .then((r) => setLocations(r?.data?.locations || []))
            .catch(() => setLocations([]));
    }, []);

    useEffect(() => {
        if (!preOrderEditOpen) return;
        const q = productSearch.trim();
        if (q.length < 2) {
            setProductHits([]);
            return;
        }
        const t = setTimeout(() => {
            getProducts({ page: 1, limit: 20, search: q }).then((res) => {
                setProductHits(res?.data?.products || []);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [productSearch, preOrderEditOpen]);

    useEffect(() => {
        if (!preOrderEditOpen) return;
        const q = customerSearch.trim();
        if (q.length < 2) {
            setCustomerHits([]);
            return;
        }
        const t = setTimeout(() => {
            searchCustomersByPhone(q).then((res) => {
                setCustomerHits(res?.data?.customers || []);
            });
        }, 250);
        return () => clearTimeout(t);
    }, [customerSearch, preOrderEditOpen]);

    const canEditPreOrder = Boolean(
        order?.isPreOrder && order?.status === 'pending' && order?.paymentStatus === 'pending',
    );
    const canDeletePreOrder = Boolean(order?.isPreOrder && order?.status !== 'completed');

    const invoiceTotals = useMemo(() => {
        const items = order?.items;
        if (!Array.isArray(items) || !items.length) {
            return { sumNet: 0, sumVat: 0, sumLineGross: 0 };
        }
        let sumNet = 0;
        let sumVat = 0;
        let sumLineGross = 0;
        for (const it of items) {
            const qty = Number(it.quantity || 0);
            const price = Number(it.price || 0);
            const net = qty * price;
            const declaredTotal = Number(it.total);
            const vatField = Number(it.vatAmount);
            let vat = 0;
            if (Number.isFinite(vatField) && vatField >= 0) {
                vat = vatField;
            } else if (Number.isFinite(declaredTotal)) {
                vat = Math.max(0, declaredTotal - net);
            }
            sumNet += net;
            sumVat += vat;
            sumLineGross +=
                Number.isFinite(declaredTotal) && declaredTotal > 0 ? declaredTotal : net + vat;
        }
        return { sumNet, sumVat, sumLineGross };
    }, [order]);

    const beginPreOrderEdit = () => {
        if (!order) return;
        const lines = (order.items || []).map((it) => {
            const p = it.product;
            const pid = p?._id || it.product;
            return {
                lineId: `${String(pid)}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                productId: String(pid),
                productName: p?.name || 'Sản phẩm',
                quantity: Math.max(1, Number(it.quantity) || 1),
                unit: (it.unit && String(it.unit).trim()) || (p?.unit && String(p.unit).trim()) || 'Cái',
            };
        });
        setPreOrderLines(lines);
        setPreOrderNote(order.note || '');
        setPreOrderDiscount(String(order.discount ?? 0));
        setPreOrderLocationId(String(order.location?._id || order.location || ''));
        const cp = order.customerProfile;
        if (cp && typeof cp === 'object' && cp._id) {
            setPreOrderCustomerId(String(cp._id));
        } else if (order.customerProfile) {
            setPreOrderCustomerId(String(order.customerProfile));
        } else {
            setPreOrderCustomerId('');
        }
        setProductSearch('');
        setProductHits([]);
        setCustomerSearch('');
        setCustomerHits([]);
        setPreOrderEditOpen(true);
    };

    const handleSavePreOrder = async () => {
        if (!id) return;
        if (!preOrderLines.length) {
            toast.error('Cần ít nhất một sản phẩm');
            return;
        }
        setSavingPreOrder(true);
        try {
            const res = await updatePreOrder(id, {
                items: preOrderLines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
                note: preOrderNote,
                discount: Number(preOrderDiscount) || 0,
                locationId: preOrderLocationId || undefined,
                customerId: preOrderCustomerId || null,
            });
            if (res?.data?.order) {
                setOrder(res.data.order);
            }
            toast.success(res?.message || 'Đã cập nhật đơn đặt hàng');
            setPreOrderEditOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không lưu được');
        } finally {
            setSavingPreOrder(false);
        }
    };

    const handleDeletePreOrder = async () => {
        if (!id) return;
        if (!window.confirm('Xóa hẳn đơn đặt hàng này? Thao tác không hoàn tác theo cách tự phục hồi.')) return;
        setDeletingPreOrder(true);
        try {
            await deletePreOrder(id);
            toast.success('Đã xóa đơn');
            navigate('/admin/orders/pre-orders');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không xóa được');
        } finally {
            setDeletingPreOrder(false);
        }
    };

    const handleSaveInvoiceNote = async () => {
        if (!id) return;
        setSavingInvoiceNote(true);
        try {
            await updateOrder(id, { note: invoiceNoteDraft });
            toast.success('Đã lưu ghi chú');
            setInvoiceNoteOpen(false);
            fetchOrder();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không lưu được ghi chú');
        } finally {
            setSavingInvoiceNote(false);
        }
    };

    const handleCancelInvoice = async () => {
        if (!id) return;
        if (
            !window.confirm(
                'Hủy đơn hàng này? Tồn kho sẽ được hoàn lại theo quy tắc hệ thống. Nếu khách đã thanh toán, cần hoàn tiền theo nghiệp vụ (mục hoàn tiền bên dưới khi đơn ở trạng thái đã hủy).',
            )
        ) {
            return;
        }
        await handleUpdate('status', 'cancelled');
    };

    const handleUpdate = async (field, value) => {
        if (!id) return;
        setUpdating(true);
        try {
            const payload = field === 'status' ? { status: value } : { paymentStatus: value };
            const res = await updateOrder(id, payload);
            const warn = res?.data?.reservationWarning;
            if (warn) {
                toast.warning(
                    'Đã lưu trạng thái. Tồn: ' + String(warn).slice(0, 200) + (String(warn).length > 200 ? '…' : '')
                );
            } else {
                toast.success('Cập nhật thành công');
            }
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

    const handleConfirmPrepared = async () => {
        if (!id) return;
        setConfirmingPrepared(true);
        try {
            const res = await confirmWarehouseItemsPrepared(id);
            if (res.success) {
                setOrder(res?.data?.order || order);
                toast.success(res.message || 'Đã xác nhận chuẩn bị hàng');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không cập nhật được bước chuẩn bị');
        } finally {
            setConfirmingPrepared(false);
        }
    };

    const handleConfirmWarehouseOutbound = async () => {
        if (!id) return;
        if (!order?.warehouseItemsPreparedAt) {
            toast.error('Cần xác nhận "đã chuẩn bị hàng" trước (dùng nút bên dưới hoặc trang Xuất kho nhanh).');
            return;
        }
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
        <div className="flex-1 min-h-0 bg-linear-to-b from-base-200 via-base-200/70 to-base-300/30 overflow-y-auto">
            <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8 space-y-6">
                <div className="flex items-center">
                    <Link
                        to={backTo || (order?.isPreOrder ? '/admin/orders/pre-orders' : '/admin/orders/invoices')}
                        className="btn btn-ghost btn-sm gap-2 rounded-full"
                    >
                        <ArrowLeft className="size-4 shrink-0" aria-hidden />
                        Quay lại
                    </Link>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-base-200 bg-base-100/80 py-20 shadow-sm">
                        <span className="loading loading-spinner loading-lg text-primary" />
                        <p className="text-sm text-base-content/60">Đang tải chi tiết đơn…</p>
                    </div>
                ) : !order ? (
                    <div className="rounded-2xl border border-base-200 bg-base-100 py-16 text-center text-base-content/60 shadow-sm">
                        Không tìm thấy đơn hàng
                    </div>
                ) : (
                    <>
                        <header className="rounded-2xl border border-base-200/80 bg-base-100 p-5 shadow-md shadow-base-300/20 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/80">
                                        Chi tiết đơn hàng
                                    </p>
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content font-mono">
                                        {order.code}
                                    </h1>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {order.isPreOrder && <span className="badge badge-outline border-amber-300/80">Đặt trước</span>}
                                    {order.isLegacyImport && (
                                        <span className="badge badge-warning badge-outline">Chứng từ cũ</span>
                                    )}
                                    <span className="badge badge-ghost whitespace-nowrap">
                                        {order.channel === 'online' ? 'Bán online' : 'Tại quầy'}
                                    </span>
                                </div>
                            </div>
                        </header>

                        {order.isPreOrder && (canEditPreOrder || canDeletePreOrder) && (
                            <div className="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm space-y-3 sm:p-5">
                                <p className="text-sm font-medium text-base-content/80">Thao tác đơn đặt hàng</p>
                                <div className="flex flex-wrap gap-2">
                                    {canEditPreOrder && !preOrderEditOpen && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary"
                                            onClick={beginPreOrderEdit}
                                        >
                                            Chỉnh sửa
                                        </button>
                                    )}
                                    {canDeletePreOrder && (
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-error btn-outline"
                                            disabled={deletingPreOrder}
                                            onClick={handleDeletePreOrder}
                                        >
                                            {deletingPreOrder ? (
                                                <span className="loading loading-spinner loading-sm" />
                                            ) : (
                                                'Xóa đơn'
                                            )}
                                        </button>
                                    )}
                                </div>

                                {preOrderEditOpen && canEditPreOrder && (
                                    <div className="pt-3 border-t border-base-200 space-y-3 text-sm">
                                        <div>
                                            <label className="label py-0">
                                                <span className="label-text">Chi nhánh</span>
                                            </label>
                                            <select
                                                className="select select-bordered select-sm w-full max-w-md"
                                                value={preOrderLocationId}
                                                onChange={(e) => setPreOrderLocationId(e.target.value)}
                                            >
                                                {locations.map((loc) => (
                                                    <option key={loc._id} value={loc._id}>
                                                        {loc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="label py-0">
                                                <span className="label-text">Tìm khách (SĐT / tên, chọn để gán)</span>
                                            </label>
                                            <input
                                                type="search"
                                                className="input input-bordered input-sm w-full max-w-md"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                placeholder="Gõ từ 2 ký tự…"
                                            />
                                            {customerHits.length > 0 && (
                                                <ul className="menu menu-xs bg-base-200 rounded-box max-h-32 overflow-auto mt-1 max-w-md border border-base-200">
                                                    {customerHits.map((c) => (
                                                        <li key={c._id}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreOrderCustomerId(String(c._id));
                                                                    setCustomerSearch(`${c.name} ${c.phone || ''}`);
                                                                }}
                                                            >
                                                                {c.name} — {c.phone || '—'}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            {preOrderCustomerId && (
                                                <p className="text-xs text-base-content/60 mt-1">
                                                    Đang gán khách ID: {preOrderCustomerId}{' '}
                                                    <button
                                                        type="button"
                                                        className="link"
                                                        onClick={() => {
                                                            setPreOrderCustomerId('');
                                                            setCustomerSearch('');
                                                        }}
                                                    >
                                                        Bỏ chọn (khách vãng lai)
                                                </button>
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label py-0">
                                                <span className="label-text">Ghi chú</span>
                                            </label>
                                            <textarea
                                                className="textarea textarea-bordered textarea-sm w-full"
                                                rows={2}
                                                value={preOrderNote}
                                                onChange={(e) => setPreOrderNote(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-end gap-2 max-w-sm">
                                            <div className="flex-1">
                                                <label className="label py-0">
                                                    <span className="label-text">Giảm giá (₫)</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input input-bordered input-sm w-full"
                                                    value={preOrderDiscount}
                                                    onChange={(e) => setPreOrderDiscount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label py-0">
                                                <span className="label-text">Thêm sản phẩm (tìm từ 2 ký tự)</span>
                                            </label>
                                            <input
                                                type="search"
                                                className="input input-bordered input-sm w-full max-w-md"
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                placeholder="Tên, SKU, mã…"
                                            />
                                            {productHits.length > 0 && (
                                                <ul className="menu menu-xs bg-base-200 rounded-box max-h-40 overflow-auto mt-1 max-w-2xl border border-base-200">
                                                    {productHits.map((p) => (
                                                        <li key={p._id}>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreOrderLines((prev) => [
                                                                        ...prev,
                                                                        {
                                                                            lineId: `${p._id}-${Date.now()}`,
                                                                            productId: String(p._id),
                                                                            productName: p.name || 'Sản phẩm',
                                                                            quantity: 1,
                                                                            unit: (p.unit && String(p.unit).trim()) || 'Cái',
                                                                        },
                                                                    ]);
                                                                    setProductSearch('');
                                                                    setProductHits([]);
                                                                }}
                                                            >
                                                                {p.name}{' '}
                                                                <span className="text-base-content/50 text-xs">
                                                                    {p.sku ? `· ${p.sku}` : ''}
                                                                </span>
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="table table-sm w-full table-zebra">
                                                <thead>
                                                    <tr>
                                                        <th>Sản phẩm</th>
                                                        <th className="w-20">ĐVT</th>
                                                        <th className="w-24">SL</th>
                                                        <th className="w-20"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {preOrderLines.map((line) => (
                                                        <tr key={line.lineId}>
                                                            <td className="max-w-xs truncate" title={line.productName}>
                                                                {line.productName}
                                                            </td>
                                                            <td className="text-sm text-base-content/80">
                                                                {line.unit || 'Cái'}
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="input input-bordered input-xs w-full"
                                                                    value={line.quantity}
                                                                    onChange={(e) => {
                                                                        const v = Math.max(
                                                                            1,
                                                                            Number(e.target.value) || 1,
                                                                        );
                                                                        setPreOrderLines((prev) =>
                                                                            prev.map((x) =>
                                                                                x.lineId === line.lineId
                                                                                    ? { ...x, quantity: v }
                                                                                    : x,
                                                                            ),
                                                                        );
                                                                    }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost btn-xs"
                                                                    onClick={() =>
                                                                        setPreOrderLines((prev) =>
                                                                            prev.filter(
                                                                                (x) => x.lineId !== line.lineId,
                                                                            ),
                                                                        )
                                                                    }
                                                                >
                                                                    Xóa dòng
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-primary"
                                                disabled={savingPreOrder}
                                                onClick={handleSavePreOrder}
                                            >
                                                {savingPreOrder ? (
                                                    <span className="loading loading-spinner loading-sm" />
                                                ) : (
                                                    'Lưu thay đổi'
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-ghost"
                                                disabled={savingPreOrder}
                                                onClick={() => setPreOrderEditOpen(false)}
                                            >
                                                Hủy chỉnh sửa
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <section className="rounded-2xl border border-base-200/90 bg-base-100 shadow-md shadow-base-300/15 overflow-hidden">
                            <div className="border-b border-base-200/80 bg-linear-to-r from-primary/8 via-base-100 to-secondary/5 px-4 py-3 sm:px-5">
                                <h2 className="text-sm font-semibold text-base-content flex items-center gap-2">
                                    <Layers className="size-4 text-primary shrink-0" aria-hidden />
                                    Thông tin đơn
                                </h2>
                            </div>
                            <div className="p-4 sm:p-5">
                            <DetailMetaRow icon={User} label="Khách hàng">
                                {formatCustomer(order)}
                            </DetailMetaRow>
                            <DetailMetaRow icon={Building2} label="Chi nhánh">
                                {order.location?.name || '—'}
                            </DetailMetaRow>
                            <DetailMetaRow icon={UserCircle} label="Nhân viên bán">
                                {formatSeller(order)}
                            </DetailMetaRow>
                            {order.channel === 'online' && (
                                <p className="text-xs text-base-content/70 bg-base-200/50 rounded-xl px-3 py-2.5 mb-2 leading-relaxed border border-base-200/60">
                                    Bán online: sau khi <strong>đã thanh toán</strong>, chuyển &quot;Chờ xử lý&quot; → &quot;Đã xác nhận / chờ
                                    xuất kho&quot;. Kho: <strong>chuẩn bị</strong> → quét <strong>Xuất kho nhanh</strong> →{' '}
                                    <strong>đã xuất kho</strong>.
                                </p>
                            )}
                            <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 border-b border-base-200/70">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45 shrink-0">
                                    Trạng thái
                                </span>
                                {order.status === 'completed' ? (
                                    <span
                                        className="badge badge-success badge-lg whitespace-normal text-left max-w-[min(100%,14rem)]"
                                        title="Chỉ nhân viên kho (quét xuất) hoặc hoàn tất đúng luồng tại quầy mới đặt trạng thái này"
                                    >
                                        {STATUS_LABELS.completed}
                                    </span>
                                ) : (
                                    <select
                                        className="select select-bordered select-sm max-w-[min(100%,14rem)]"
                                        value={order.status && STATUS_LABELS[order.status] ? order.status : 'pending'}
                                        onChange={(e) => handleUpdate('status', e.target.value)}
                                        disabled={updating}
                                    >
                                        {STATUS_MANUAL_SELECT_KEYS.map((v) => (
                                            <option key={v} value={v}>
                                                {STATUS_LABELS[v]}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 border-b border-base-200/70">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45 flex items-center gap-2 shrink-0">
                                    <Banknote className="size-3.5 opacity-80" aria-hidden />
                                    Thanh toán
                                </span>
                                <div className="flex flex-wrap items-center justify-end gap-1">
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
                            <DetailMetaRow icon={Truck} label="Địa chỉ giao hàng">
                                {order.shippingAddress || '—'}
                            </DetailMetaRow>
                            {order.shippingPhone && (
                                <DetailMetaRow label="SĐT nhận hàng">{order.shippingPhone}</DetailMetaRow>
                            )}
                            <DetailMetaRow icon={FileText} label="Ghi chú">
                                {order.note?.trim() ? order.note : '—'}
                            </DetailMetaRow>
                            {!order.isPreOrder && canManageInvoice && (
                                <div className="pt-3 mt-2 border-t border-base-200 space-y-2">
                                    <p className="text-sm font-medium text-base-content/80">Thao tác hóa đơn</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary btn-outline"
                                            disabled={updating}
                                            onClick={() => {
                                                setInvoiceNoteDraft(order.note || '');
                                                setInvoiceNoteOpen(true);
                                            }}
                                        >
                                            Sửa ghi chú
                                        </button>
                                        {order.status !== 'cancelled' && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-error btn-outline"
                                                disabled={updating}
                                                onClick={handleCancelInvoice}
                                            >
                                                Hủy đơn
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            {/* Đặt trước: không hiện khối xuất kho tại đây (dùng màn Quét xuất). Hóa đơn tại quầy: giữ hướng dẫn nhanh. */}
                            {!order.isPreOrder &&
                                canConfirmWarehouse &&
                                order.warehouseReservationActive === true &&
                                order.paymentStatus === 'paid' &&
                                order.status === 'confirmed' && (
                                    <div className="pt-3 mt-2 border-t border-base-200 space-y-2">
                                        <p className="text-sm font-medium text-base-content/80">Kho — chuẩn bị & xuất</p>
                                        <p className="text-xs text-base-content/60">
                                            Khuyên dùng màn <Link to="/admin/warehouses/outbound-scan" className="link link-primary">Quét
                                            xuất (Tại quầy & Online)</Link> theo từng bước. Trạng thái <strong>Đã xuất kho</strong> chỉ
                                            tới sau bước thứ 3 dưới hệ thống.
                                        </p>
                                        <p className="text-xs text-base-content/80">
                                            Chuẩn bị hàng:{' '}
                                            {order.warehouseItemsPreparedAt ? (
                                                <span className="badge badge-success badge-sm">Đã xác nhận chuẩn bị</span>
                                            ) : (
                                                <span className="badge badge-ghost badge-sm">Chưa bấm xác nhận chuẩn bị</span>
                                            )}
                                        </p>
                                        {!order.warehouseItemsPreparedAt && (
                                            <button
                                                type="button"
                                                className="btn btn-warning btn-sm w-full sm:w-auto"
                                                disabled={confirmingPrepared}
                                                onClick={handleConfirmPrepared}
                                            >
                                                {confirmingPrepared ? (
                                                    <span className="loading loading-spinner loading-sm" />
                                                ) : (
                                                    'Bước 1 — Xác nhận đã chuẩn bị hàng (gom đủ tại kho)'
                                                )}
                                            </button>
                                        )}
                                        {Array.isArray(order.items) && order.items.length > 0 && (
                                            <p className="text-xs text-base-content/70">
                                                Đóng gói (bước 2, thường tại màn xuất kho nhanh):{' '}
                                                <span className="font-medium">
                                                    {(order.warehousePackedLineIndexes || []).length}/{order.items.length} dòng
                                                </span>
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            disabled={confirmingOutbound || !order.warehouseItemsPreparedAt}
                                            onClick={handleConfirmWarehouseOutbound}
                                        >
                                            {confirmingOutbound ? (
                                                <span className="loading loading-spinner loading-sm" />
                                            ) : (
                                                'Bước 3 — Xác nhận đã xuất kho (khi đã chuẩn bị + quét đủ dòng)'
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
                        </section>

                        <section className="rounded-2xl border border-base-200/90 bg-base-100 shadow-md shadow-base-300/15 overflow-hidden">
                            <div className="border-b border-base-200/80 bg-linear-to-r from-secondary/10 via-base-100 to-primary/5 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
                                <h2 className="text-sm font-semibold text-base-content flex items-center gap-2">
                                    <Package className="size-4 text-primary shrink-0" aria-hidden />
                                    Chi tiết sản phẩm
                                </h2>
                                <span className="badge badge-ghost badge-sm font-mono">
                                    {Array.isArray(order.items) ? order.items.length : 0} dòng
                                </span>
                            </div>

                            <div className="p-4 sm:p-5 space-y-4">
                                {(order.items || []).map((item, idx) => {
                                    const p = item.product || {};
                                    const pid = String(p._id ?? item.product ?? '');
                                    const stock = pid ? branchStockMap[pid] : null;
                                    const img = p.images?.[0] || p.image || '';
                                    const qty = Number(item.quantity || 0);
                                    const price = Number(item.price || 0);
                                    const net = qty * price;
                                    const declaredTotal = Number(item.total);
                                    const vatField = Number(item.vatAmount);
                                    let vat = 0;
                                    if (Number.isFinite(vatField) && vatField >= 0) {
                                        vat = vatField;
                                    } else if (Number.isFinite(declaredTotal)) {
                                        vat = Math.max(0, declaredTotal - net);
                                    }
                                    const lineGross =
                                        Number.isFinite(declaredTotal) && declaredTotal > 0
                                            ? declaredTotal
                                            : net + vat;
                                    const vatPct =
                                        item.vatPercent != null && item.vatPercent !== ''
                                            ? Number(item.vatPercent)
                                            : null;
                                    return (
                                        <article
                                            key={idx}
                                            className="rounded-xl border border-base-200/80 bg-linear-to-br from-base-100 to-base-200/25 p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                                        >
                                            <div className="flex flex-col sm:flex-row gap-4">
                                                <div className="shrink-0 mx-auto sm:mx-0">
                                                    <div className="w-20 h-20 rounded-xl bg-base-200 border border-base-200/80 overflow-hidden flex items-center justify-center">
                                                        {img ? (
                                                            <img src={img} alt="" className="w-full h-full object-contain p-1" />
                                                        ) : (
                                                            <span className="text-xs text-base-content/35">N/A</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-2">
                                                    <div>
                                                        <h3 className="font-semibold text-base text-base-content leading-snug">
                                                            {p.name || 'Sản phẩm'}
                                                        </h3>
                                                        <p className="text-xs text-base-content/55 font-mono mt-0.5">
                                                            {[p.sku ? `SKU ${p.sku}` : null, p.barcode ? `MV ${p.barcode}` : null]
                                                                .filter(Boolean)
                                                                .join(' · ') || '—'}
                                                        </p>
                                                    </div>
                                                    {(order.location?._id ?? order.location) && (
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                                            {stock ? (
                                                                <>
                                                                    <span className="inline-flex items-center rounded-md bg-base-200/90 px-2 py-0.5 font-medium text-base-content/80 border border-base-300/50">
                                                                        Tồn: {stock.qty.toLocaleString('vi-VN')}
                                                                    </span>
                                                                    <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-900/80 border border-amber-300/40">
                                                                        Đặt: {stock.reserved.toLocaleString('vi-VN')}
                                                                    </span>
                                                                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary border border-primary/20">
                                                                        Bán: {stock.avail.toLocaleString('vi-VN')}
                                                                    </span>
                                                                    <span className="text-base-content/40">
                                                                        · {order.location?.name || 'chi nhánh'} (hiện tại)
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-base-content/45">
                                                                    Chưa có dữ liệu tồn theo chi nhánh cho mã này
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                                        <div className="rounded-lg bg-base-200/50 border border-base-200/60 px-2.5 py-2 text-center">
                                                            <dt className="text-[10px] uppercase text-base-content/50">ĐVT</dt>
                                                            <dd className="text-sm font-semibold">{item.unit || 'Cái'}</dd>
                                                        </div>
                                                        <div className="rounded-lg bg-base-200/50 border border-base-200/60 px-2.5 py-2 text-center">
                                                            <dt className="text-[10px] uppercase text-base-content/50">SL</dt>
                                                            <dd className="text-sm font-semibold tabular-nums">{qty}</dd>
                                                        </div>
                                                        <div className="rounded-lg bg-base-200/50 border border-base-200/60 px-2.5 py-2 text-center col-span-2 sm:col-span-1">
                                                            <dt className="text-[10px] uppercase text-base-content/50">Đơn giá</dt>
                                                            <dd className="text-sm font-semibold tabular-nums">{formatMoney(price)}</dd>
                                                        </div>
                                                        <div className="rounded-lg bg-base-200/50 border border-base-200/60 px-2.5 py-2 text-center col-span-2 sm:col-span-1">
                                                            <dt className="text-[10px] uppercase text-base-content/50">Thuế</dt>
                                                            <dd className="text-sm font-semibold tabular-nums">
                                                                {formatMoney(vat)}
                                                                {Number.isFinite(vatPct) && vatPct >= 0 ? (
                                                                    <span className="text-base-content/45 font-normal"> ({vatPct}%)</span>
                                                                ) : null}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                    <div className="flex justify-end pt-1 border-t border-base-200/60">
                                                        <span className="text-xs text-base-content/50 mr-2 self-center">Thành tiền</span>
                                                        <span className="text-lg font-bold text-primary tabular-nums">
                                                            {formatMoney(lineGross)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="border-t border-base-200/80 bg-linear-to-t from-base-200/40 to-base-100 px-4 py-4 sm:px-5 space-y-2">
                                <div className="flex justify-between text-sm text-base-content/70">
                                    <span>Tiền hàng (chưa thuế)</span>
                                    <span className="font-medium tabular-nums">{formatMoney(invoiceTotals.sumNet)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-base-content/70">
                                    <span>Thuế GTGT</span>
                                    <span className="font-medium tabular-nums">{formatMoney(invoiceTotals.sumVat)}</span>
                                </div>
                                {Number(order.discount || 0) > 0 && (
                                    <div className="flex justify-between text-sm text-success">
                                        <span>Chiết khấu</span>
                                        <span className="font-medium tabular-nums">−{formatMoney(order.discount || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-baseline pt-3 mt-1 border-t border-base-300/50">
                                    <span className="text-base font-bold text-base-content">Tổng thanh toán</span>
                                    <span className="text-xl font-bold text-primary tabular-nums tracking-tight">
                                        {formatMoney(order.totalAmount || 0)}
                                    </span>
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </div>

            {invoiceNoteOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box max-w-lg">
                        <h3 className="font-bold text-lg mb-2">Ghi chú hóa đơn</h3>
                        <textarea
                            className="textarea textarea-bordered w-full text-sm"
                            rows={4}
                            maxLength={2000}
                            value={invoiceNoteDraft}
                            onChange={(e) => setInvoiceNoteDraft(e.target.value)}
                            placeholder="Ghi chú nội bộ / giao hàng…"
                        />
                        <p className="text-xs text-base-content/60 mt-1">
                            {(invoiceNoteDraft || '').length}/2000 ký tự
                        </p>
                        <div className="modal-action">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                disabled={savingInvoiceNote}
                                onClick={() => setInvoiceNoteOpen(false)}
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={savingInvoiceNote}
                                onClick={handleSaveInvoiceNote}
                            >
                                {savingInvoiceNote ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    'Lưu'
                                )}
                            </button>
                        </div>
                    </div>
                    <form
                        method="dialog"
                        className="modal-backdrop"
                        onClick={() => !savingInvoiceNote && setInvoiceNoteOpen(false)}
                    >
                        <button type="button">close</button>
                    </form>
                </dialog>
            )}

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
