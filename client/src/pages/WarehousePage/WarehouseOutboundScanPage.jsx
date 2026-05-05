import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import { ChevronDown, Package, Printer, RefreshCw, ScanLine } from 'lucide-react';
import { getOnlineLocation } from '@/services/locationService';
import { useBranchStore } from '@/stores/useBranchStore';
import { printWarehouseOrderSlip } from '@/lib/warehouseOrderSlipPrint';
import {
    getMyOrders,
    getOrderById,
    lookupOnlineOrderForPacking,
    packWarehouseOrderLine,
    confirmWarehouseOutbound,
    confirmWarehouseItemsPrepared,
} from '@/services/orderService';
import { toast } from 'sonner';

/**
 * Xuất kho nhanh: danh sách đơn chờ → bấm mở từng đơn → quét SKU từng dòng → xác nhận xuất kho.
 */
/** Màu phân loại: tại quầy (POS) vs đơn web — giúp kho nhận diện nhanh. */
const channelStyles = {
    in_store: {
        label: 'Tại quầy',
        badge: 'bg-amber-500/12 text-amber-950 border border-amber-400/50',
        rowBorder: 'border-l-[5px] border-l-amber-500',
        strip: 'from-amber-500/15 to-transparent',
    },
    online: {
        label: 'Online',
        badge: 'bg-sky-500/12 text-sky-950 border border-sky-500/45',
        rowBorder: 'border-l-[5px] border-l-sky-500',
        strip: 'from-sky-500/15 to-transparent',
    },
};

/** Lọc hàng chờ xuất: rỗng = tất cả; 'in_store' = đặt/bán tại quầy; 'online' = đơn web */
const QUEUE_FILTERS = [
    { value: '', label: 'Tất cả' },
    { value: 'in_store', label: 'Đặt tại quầy' },
    { value: 'online', label: 'Online (web)' },
];

const WarehouseOutboundScanPage = () => {
    const currentLocationId = useBranchStore((s) => s.currentLocationId);
    const currentLocation = useBranchStore((s) => s.locations.find((l) => l._id === s.currentLocationId) || null);

    const [onlineInfo, setOnlineInfo] = useState({ location: null, resolvedAs: null });
    const [onlineLoading, setOnlineLoading] = useState(true);
    const onlineLocation = onlineInfo.location;

    const [queueChannelFilter, setQueueChannelFilter] = useState('');
    const [queue, setQueue] = useState([]);
    const [queueLoading, setQueueLoading] = useState(false);

    const [openOrderId, setOpenOrderId] = useState(null);
    const loadTokenRef = useRef(0);

    const [activeOrder, setActiveOrder] = useState(null);
    const [packingProgress, setPackingProgress] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [scanSku, setScanSku] = useState('');
    const [packLoading, setPackLoading] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [preparedLoading, setPreparedLoading] = useState(false);
    const [printLoadingId, setPrintLoadingId] = useState(null);
    const skuInputRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setOnlineLoading(true);
        getOnlineLocation()
            .then((r) => {
                if (!cancelled) {
                    setOnlineInfo({
                        location: r?.data?.location || null,
                        resolvedAs: r?.data?.resolvedAs || null,
                    });
                }
            })
            .catch(() => {
                if (!cancelled) setOnlineInfo({ location: null, resolvedAs: null });
            })
            .finally(() => {
                if (!cancelled) setOnlineLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadQueue = useCallback(async () => {
        setQueueLoading(true);
        try {
            const res = await getMyOrders({
                warehouseQueue: true,
                limit: 50,
                page: 1,
                ...(queueChannelFilter && { channel: queueChannelFilter }),
                ...(currentLocationId &&
                    currentLocationId !== 'all' && { locationId: currentLocationId }),
            });
            setQueue(res?.data?.orders || []);
        } catch {
            toast.error('Không tải được hàng chờ xuất');
        } finally {
            setQueueLoading(false);
        }
    }, [queueChannelFilter, currentLocationId]);

    useEffect(() => {
        loadQueue();
    }, [loadQueue]);

    const applyPackingResponse = (res) => {
        const d = res?.data;
        if (d?.order) setActiveOrder(d.order);
        if (d?.lines) {
            setPackingProgress({
                lines: d.lines,
                packedLineIndexes: d.packedLineIndexes,
                packedCount: d.packedCount,
                totalLines: d.totalLines,
                allPacked: d.allPacked,
                itemsPrepared: d.itemsPrepared,
            });
        }
    };

    const clearExpanded = () => {
        loadTokenRef.current += 1;
        setOpenOrderId(null);
        setActiveOrder(null);
        setPackingProgress(null);
        setScanSku('');
        setDetailLoading(false);
    };

    const handleToggleOrder = async (orderId) => {
        if (openOrderId === orderId) {
            clearExpanded();
            return;
        }

        const token = ++loadTokenRef.current;
        setOpenOrderId(orderId);
        setActiveOrder(null);
        setPackingProgress(null);
        setScanSku('');
        setDetailLoading(true);

        try {
            const res = await lookupOnlineOrderForPacking({ scan: orderId });
            if (token !== loadTokenRef.current) return;
            applyPackingResponse(res);
            toast.success('Đã tải đơn — quét SKU/mã vạch từng dòng');
            setTimeout(() => skuInputRef.current?.focus(), 50);
        } catch (err) {
            if (token !== loadTokenRef.current) return;
            toast.error(err.response?.data?.message || 'Không tải được đơn');
            setOpenOrderId(null);
        } finally {
            if (token === loadTokenRef.current) setDetailLoading(false);
        }
    };

    const submitPackLine = async (e) => {
        e?.preventDefault();
        const needle = scanSku.trim();
        if (!needle) {
            toast.error('Quét SKU hoặc mã vạch sản phẩm');
            return;
        }
        if (!activeOrder?._id) return;
        setPackLoading(true);
        try {
            const res = await packWarehouseOrderLine(activeOrder._id, { scannedSku: needle });
            applyPackingResponse(res);
            toast.success(res?.message || 'Đã đóng gói một dòng');
            setScanSku('');
            skuInputRef.current?.focus();
            loadQueue();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Mã quét không khớp dòng chưa đóng gói');
        } finally {
            setPackLoading(false);
        }
    };

    const submitConfirmPrepared = async () => {
        if (!activeOrder?._id) return;
        setPreparedLoading(true);
        try {
            const res = await confirmWarehouseItemsPrepared(activeOrder._id);
            applyPackingResponse(res);
            toast.success(res?.message || 'Đã xác nhận chuẩn bị hàng');
            loadQueue();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không cập nhật được bước chuẩn bị');
        } finally {
            setPreparedLoading(false);
        }
    };

    const isItemsPrepared = () =>
        Boolean(
            packingProgress?.itemsPrepared ??
                (activeOrder?.warehouseItemsPreparedAt != null && String(activeOrder.warehouseItemsPreparedAt) !== '')
        );

    const submitConfirmOutbound = async () => {
        if (!activeOrder?._id) return;
        if (!isItemsPrepared()) {
            toast.error('Bấm "Xác nhận đã chuẩn bị hàng" trước, rồi mới quét từng dòng');
            return;
        }
        if (!packingProgress?.allPacked) {
            toast.error('Chưa đóng gói đủ tất cả dòng trong đơn');
            return;
        }
        setConfirmLoading(true);
        try {
            const res = await confirmWarehouseOutbound(activeOrder._id, {});
            toast.success(res?.message || 'Đã xác nhận xuất kho');
            clearExpanded();
            loadQueue();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không xác nhận được xuất kho');
        } finally {
            setConfirmLoading(false);
        }
    };

    const itemCount = (o) =>
        Array.isArray(o.items) ? o.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0;

    const formatMoney = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

    const formatOrderDate = (o) => {
        if (!o?.createdAt) return '—';
        try {
            return new Date(o.createdAt).toLocaleString('vi-VN');
        } catch {
            return '—';
        }
    };

    const customerLabel = (o) => {
        if (o?.customerProfile?.name) return o.customerProfile.name;
        const c = o?.customer;
        if (!c) return 'Khách';
        const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username;
        return name || c.email || 'Khách';
    };

    const shippingAddressBlock = (o) => {
        if (!o) return null;
        const parts = [o.addressLine, o.wardName, o.districtName, o.provinceName].filter(Boolean);
        const line = parts.length ? parts.join(', ') : (o.shippingAddress || '').trim();
        return line || null;
    };

    /** In phiếu soạn hàng — ưu tiên dữ liệu đã mở đơn (kèm tiến độ đóng gói). */
    const handlePrintWarehouseSlip = async (queueOrder) => {
        if (!queueOrder?._id) return;
        const sameExpanded =
            activeOrder &&
            packingProgress &&
            String(activeOrder._id) === String(queueOrder._id);
        if (sameExpanded) {
            printWarehouseOrderSlip(activeOrder, packingProgress);
            return;
        }
        setPrintLoadingId(queueOrder._id);
        try {
            const res = await getOrderById(queueOrder._id);
            const ord = res?.data?.order;
            if (!ord) {
                toast.error('Không lấy được chi tiết đơn');
                return;
            }
            printWarehouseOrderSlip(ord, null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không in được phiếu');
        } finally {
            setPrintLoadingId(null);
        }
    };

    /** Chi tiết đơn dùng cho panel (ưu tiên activeOrder sau khi lookup). */
    const OrderDetailCard = ({ order: ord }) => {
        if (!ord) return null;
        const addr = shippingAddressBlock(ord);
        const ch = ord.channel === 'in_store' ? 'in_store' : 'online';
        const chSt = channelStyles[ch];
        return (
            <div
                className={`relative overflow-hidden rounded-xl border border-base-300/70 bg-base-100 p-4 sm:p-5 text-sm shadow-sm ${chSt.rowBorder}`}
            >
                <div
                    className={`pointer-events-none absolute inset-y-0 right-0 w-32 bg-linear-to-l ${chSt.strip} to-base-100`}
                    aria-hidden
                />
                <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-base-content/45">Chi tiết đơn hàng</p>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${chSt.badge}`}>
                        {chSt.label}
                    </span>
                </div>
                <div className="relative mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                        <span className="text-base-content/55 text-xs block">Mã đơn</span>
                        <span className="font-mono font-semibold">{ord.code}</span>
                    </div>
                    <div>
                        <span className="text-base-content/55 text-xs block">Ngày đặt</span>
                        <span>{formatOrderDate(ord)}</span>
                    </div>
                    <div>
                        <span className="text-base-content/55 text-xs block">Khách hàng</span>
                        <span>{customerLabel(ord)}</span>
                        {ord.customerProfile?.phone ? (
                            <span className="text-xs text-base-content/60 block">SĐT: {ord.customerProfile.phone}</span>
                        ) : null}
                    </div>
                    <div>
                        <span className="text-base-content/55 text-xs block">Tổng tiền</span>
                        <span className="font-semibold text-primary">{formatMoney(ord.totalAmount)}</span>
                    </div>
                </div>
                {(ord.shippingRecipientName || ord.shippingPhone) && (
                    <div className="pt-2 border-t border-base-200">
                        <span className="text-base-content/55 text-xs block mb-0.5">Giao hàng</span>
                        {ord.shippingRecipientName?.trim() ? (
                            <p className="font-medium">{ord.shippingRecipientName.trim()}</p>
                        ) : null}
                        {ord.shippingPhone ? <p className="text-base-content/80">SĐT nhận: {ord.shippingPhone}</p> : null}
                    </div>
                )}
                {addr ? (
                    <div className="pt-2 border-t border-base-200">
                        <span className="text-base-content/55 text-xs block mb-0.5">Địa chỉ giao</span>
                        <p className="text-base-content/90 leading-snug">{addr}</p>
                    </div>
                ) : null}
                {ord.note?.trim() ? (
                    <div className="pt-2 border-t border-base-200">
                        <span className="text-base-content/55 text-xs block mb-0.5">Ghi chú</span>
                        <p className="text-base-content/90 whitespace-pre-wrap">{ord.note.trim()}</p>
                    </div>
                ) : null}
                {Array.isArray(ord.items) && ord.items.length > 0 && (
                    <div className="relative pt-3 border-t border-base-200/90">
                        <span className="text-base-content/55 text-xs mb-2 flex items-center gap-1.5 font-medium">
                            <Package className="size-3.5 opacity-70" aria-hidden />
                            Sản phẩm trong đơn
                        </span>
                        <ul className="divide-y divide-base-200/80 rounded-lg border border-base-200/80 bg-base-200/20">
                            {ord.items.map((it, idx) => {
                                const p = it.product;
                                const name = p?.name || 'Sản phẩm';
                                const sku = p?.sku ? ` · SKU ${p.sku}` : '';
                                return (
                                    <li key={idx} className="flex justify-between gap-3 px-3 py-2 text-xs">
                                        <span className="min-w-0 truncate">
                                            <span className="font-medium text-base-content">{name}</span>
                                            <span className="text-base-content/55">{sku}</span>
                                        </span>
                                        <span className="shrink-0 font-semibold tabular-nums">×{it.quantity || 0}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex-1 bg-base-200/50 overflow-y-auto">
            <div className="mx-auto w-full max-w-[min(100%,1400px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
                <header className="rounded-2xl border border-base-300/60 bg-base-100 p-5 sm:p-6 shadow-sm ring-1 ring-black/3">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                                <ScanLine className="size-6" aria-hidden />
                            </span>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight text-base-content sm:text-3xl">
                                    Quét xuất: Tại quầy &amp; Online
                                </h1>
                                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-base-content/70">
                                    Chọn đơn trong danh sách, quét SKU từng dòng, rồi xác nhận xuất kho. Viền trái và nhãn
                                    màu: <span className="font-semibold text-amber-800">tại quầy</span> (POS) và{' '}
                                    <span className="font-semibold text-sky-800">online</span> (web).
                                </p>
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-base-content/60">
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300/80 bg-base-200/40 px-2.5 py-1">
                                        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
                                        Tại quầy (POS)
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-base-300/80 bg-base-200/40 px-2.5 py-1">
                                        <span className="h-2 w-2 rounded-full bg-sky-500" aria-hidden />
                                        Online (web)
                                    </span>
                                </div>
                            </div>
                        </div>
                        <Link
                            to="/admin/warehouses/stock-out"
                            className="btn btn-outline btn-sm shrink-0 rounded-xl border-base-300"
                        >
                            Phiếu xuất kho
                        </Link>
                    </div>
                </header>

                <section className="overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-sm ring-1 ring-black/3">
                    <div className="border-b border-base-200/90 bg-base-200/35 px-4 py-4 sm:px-6 sm:py-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-base-content">Đơn chờ xuất kho</h2>
                                <p className="mt-0.5 text-xs text-base-content/55">Danh sách theo cơ sở đang chọn trên thanh điều hướng</p>
                            </div>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm gap-2 rounded-xl border border-base-300/80 bg-base-100"
                                onClick={loadQueue}
                                disabled={queueLoading}
                            >
                                {queueLoading ? (
                                    <span className="loading loading-spinner loading-sm text-primary" />
                                ) : (
                                    <RefreshCw className="size-4" aria-hidden />
                                )}
                                Làm mới
                            </button>
                        </div>
                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/45 shrink-0">
                                Lọc kênh
                            </span>
                            <div className="inline-flex flex-wrap gap-1 rounded-xl bg-base-100/90 p-1 ring-1 ring-base-300/60">
                                {QUEUE_FILTERS.map((opt) => (
                                    <button
                                        key={opt.value || 'all'}
                                        type="button"
                                        className={`min-h-9 rounded-lg px-3.5 text-sm font-medium transition-colors ${
                                            queueChannelFilter === opt.value
                                                ? 'bg-primary text-primary-content shadow-sm'
                                                : 'text-base-content/70 hover:bg-base-200/80'
                                        }`}
                                        onClick={() => setQueueChannelFilter(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 space-y-2 rounded-xl border border-base-300/50 bg-base-100/60 px-3 py-3 text-xs text-base-content/70 sm:px-4">
                            <p>
                                <span className="font-medium text-base-content/80">Cơ sở đang xử lý:</span>{' '}
                                {currentLocationId === 'all' || !currentLocationId ? (
                                    <span className="text-base-content">Tất cả chi nhánh (admin)</span>
                                ) : (
                                    <span className="font-medium text-base-content">
                                        {currentLocation?.name || currentLocation?.code || '—'}
                                    </span>
                                )}
                            </p>
                            <p>
                                <span className="font-medium text-base-content/80">Kho bán online (giao từ xa):</span>{' '}
                                {onlineLoading ? (
                                    <span className="loading loading-spinner loading-xs align-middle" />
                                ) : onlineLocation ? (
                                    <>
                                        <span className="font-medium text-base-content">{onlineLocation.name || onlineLocation.code}</span>
                                        {onlineInfo.resolvedAs === 'fallback_first_active' && (
                                            <span className="text-amber-700 ml-1">(fallback chi nhánh đầu tiên)</span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-base-content/50">Chưa cấu hình</span>
                                )}
                            </p>
                            {currentLocationId && currentLocationId !== 'all' && onlineLocation?._id && (
                                <p className="text-base-content/55 leading-relaxed">
                                    {String(currentLocationId) === String(onlineLocation._id)
                                        ? 'Đơn online web sẽ xuất hiện trong danh sách bên dưới (cùng đơn tại quầy của cơ sở này).'
                                        : 'Đơn online chỉ thuộc kho bán online ở trên — khi bạn chọn cơ sở khác, danh sách chỉ còn đơn tại quầy của cơ sở đang chọn.'}
                                </p>
                            )}
                        </div>
                    </div>

                    {queueLoading && queue.length === 0 ? (
                        <div className="flex justify-center py-20">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : queue.length === 0 ? (
                        <p className="px-6 py-14 text-center text-sm text-base-content/55">Không có đơn nào đang chờ xuất kho.</p>
                    ) : (
                        <ul className="divide-y divide-base-200/90 text-sm max-h-[min(78vh,800px)] overflow-y-auto">
                            {queue.map((o) => {
                                const expanded = openOrderId === o._id;
                                const isActive =
                                    expanded &&
                                    activeOrder &&
                                    String(activeOrder._id) === String(o._id);
                                const addrPreview = shippingAddressBlock(o);
                                const ch = o.channel === 'in_store' ? 'in_store' : 'online';
                                const chStyle = channelStyles[ch];
                                return (
                                    <li
                                        key={o._id}
                                        className={`bg-base-100 transition-colors hover:bg-base-200/25 ${chStyle.rowBorder}`}
                                    >
                                        <div className="flex items-stretch">
                                            <button
                                                type="button"
                                                className="flex min-w-0 flex-1 items-start gap-3 px-4 py-4 text-left sm:items-center sm:gap-4 sm:px-5 sm:py-4"
                                                onClick={() => handleToggleOrder(o._id)}
                                            >
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200/80 text-base-content/55 ring-1 ring-base-300/50">
                                                    <ChevronDown
                                                        className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                                        aria-hidden
                                                    />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2 gap-y-1">
                                                        <span className="font-mono text-base font-semibold tracking-tight text-base-content">
                                                            {o.code}
                                                        </span>
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${chStyle.badge}`}
                                                        >
                                                            {chStyle.label}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-base-content/70">
                                                        <span>{formatOrderDate(o)}</span>
                                                        <span className="text-base-content/35">·</span>
                                                        <span className="font-semibold tabular-nums text-primary">
                                                            {formatMoney(o.totalAmount)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1.5 text-xs leading-snug text-base-content/60 sm:text-sm">
                                                        <span className="font-medium text-base-content/80">{customerLabel(o)}</span>
                                                        <span className="text-base-content/40"> · </span>
                                                        <span>{itemCount(o)} sản phẩm</span>
                                                        {addrPreview ? (
                                                            <>
                                                                <span className="text-base-content/40"> · </span>
                                                                <span className="text-base-content/55">{addrPreview}</span>
                                                            </>
                                                        ) : null}
                                                    </p>
                                                </div>
                                                <div className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
                                                    {o.warehouseItemsPreparedAt ? (
                                                        <span className="badge badge-success badge-sm border-0">Đã chuẩn bị</span>
                                                    ) : (
                                                        <span className="badge badge-ghost badge-sm border border-base-300/80">
                                                            Chưa chuẩn bị
                                                        </span>
                                                    )}
                                                    <span className="badge badge-warning badge-sm border-0">Chờ xuất kho</span>
                                                </div>
                                            </button>
                                            <div className="flex shrink-0 flex-col border-l border-base-200/90 sm:hidden">
                                                <div className="flex flex-1 flex-wrap content-center justify-end gap-1 px-3 py-2">
                                                    {o.warehouseItemsPreparedAt ? (
                                                        <span className="badge badge-success badge-sm scale-90 border-0 px-2 text-[10px]">
                                                            Đã CB
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-ghost badge-sm scale-90 border border-base-300/80 px-2 text-[10px]">
                                                            Chưa CB
                                                        </span>
                                                    )}
                                                    <span className="badge badge-warning badge-sm scale-90 border-0 px-2 text-[10px]">
                                                        Chờ XK
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="flex w-12 shrink-0 items-center justify-center border-l border-base-200/90 bg-base-200/20 text-base-content/60 transition-colors hover:bg-primary/10 hover:text-primary sm:w-14"
                                                title="In phiếu soạn hàng (không cần mở đơn)"
                                                disabled={printLoadingId === o._id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePrintWarehouseSlip(o);
                                                }}
                                            >
                                                {printLoadingId === o._id ? (
                                                    <span className="loading loading-spinner loading-sm text-primary" />
                                                ) : (
                                                    <Printer className="size-5" aria-hidden />
                                                )}
                                            </button>
                                        </div>

                                        {expanded && (
                                            <div className="border-t border-base-200/90 bg-linear-to-b from-base-200/40 to-base-200/15 px-4 pb-5 pt-1 sm:px-6">
                                                {detailLoading && !isActive ? (
                                                    <div className="flex justify-center py-8">
                                                        <span className="loading loading-spinner text-primary" />
                                                    </div>
                                                ) : isActive && packingProgress && activeOrder ? (
                                                    <div className="mx-auto max-w-4xl space-y-4 pt-4">
                                                        <OrderDetailCard order={activeOrder} />
                                                        {!isItemsPrepared() ? (
                                                            <div className="rounded-xl border border-amber-400/50 bg-amber-500/8 p-4 shadow-sm dark:bg-amber-950/25 space-y-3">
                                                                <p className="text-base font-semibold text-base-content">
                                                                    Bước 1 — Chuẩn bị hàng
                                                                </p>
                                                                <p className="text-sm text-base-content/80 leading-relaxed">
                                                                    Sau khi lấy đủ sản phẩm tại kho, bấm xác nhận. Sau đó bước 2 mới
                                                                    quét từng dòng đóng gói, bước 3 xuất kho (trừ tồn) — trạng thái
                                                                    đơn sẽ là <strong>Đã xuất kho / hoàn thành</strong>.
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-warning rounded-xl"
                                                                    disabled={preparedLoading}
                                                                    onClick={submitConfirmPrepared}
                                                                >
                                                                    {preparedLoading ? (
                                                                        <span className="loading loading-spinner loading-sm" />
                                                                    ) : (
                                                                        'Xác nhận đã chuẩn bị hàng'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm font-semibold text-base-content pt-1">
                                                                    Bước 2 &amp; 3 — Đóng gói từng dòng, xuất kho
                                                                </p>
                                                                <p className="text-sm text-base-content/70">
                                                                    Đóng gói: {packingProgress.packedCount}/
                                                                    {packingProgress.totalLines} dòng
                                                                    {packingProgress.allPacked && (
                                                                        <span className="ml-2 badge badge-success badge-sm">
                                                                            Đủ dòng — có thể bấm xuất kho
                                                                        </span>
                                                                    )}
                                                                </p>

                                                                <ul className="max-h-52 overflow-y-auto rounded-xl border border-base-300/60 divide-y divide-base-200/90 bg-base-100 text-sm shadow-inner">
                                                                    {packingProgress.lines.map((line) => (
                                                                        <li
                                                                            key={line.lineIndex}
                                                                            className={`px-3 py-2 flex flex-wrap justify-between gap-2 ${
                                                                                line.packed ? 'bg-success/10' : ''
                                                                            }`}
                                                                        >
                                                                            <span>
                                                                                {line.packed ? '✓ ' : '○ '}
                                                                                <span className="font-medium">{line.productName}</span>
                                                                                <span className="text-base-content/60">
                                                                                    {' '}
                                                                                    ×{line.quantity}
                                                                                </span>
                                                                            </span>
                                                                            <span className="font-mono text-xs text-base-content/70">
                                                                                SKU {line.sku}
                                                                                {line.barcode ? ` · ${line.barcode}` : ''}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>

                                                                <form onSubmit={submitPackLine} className="space-y-3 rounded-xl border border-base-300/60 bg-base-100 p-4 shadow-sm">
                                                                    <label className="label py-0 text-xs font-bold uppercase tracking-wide text-base-content/50">
                                                                        Quét SKU / mã vạch (dòng chưa đóng gói)
                                                                    </label>
                                                                    <input
                                                                        ref={skuInputRef}
                                                                        type="text"
                                                                        className="input input-bordered input-sm h-11 w-full font-mono text-base sm:h-12"
                                                                        placeholder="Quét sản phẩm vừa cho vào thùng"
                                                                        value={scanSku}
                                                                        onChange={(e) => setScanSku(e.target.value)}
                                                                        autoComplete="off"
                                                                        disabled={packingProgress.allPacked}
                                                                    />
                                                                    <div className="flex flex-wrap gap-2">
                                                                        <button
                                                                            type="submit"
                                                                            className="btn btn-primary rounded-xl"
                                                                            disabled={packLoading || packingProgress.allPacked}
                                                                        >
                                                                            {packLoading ? (
                                                                                <span className="loading loading-spinner loading-sm" />
                                                                            ) : (
                                                                                'Xác nhận đóng gói dòng'
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-success rounded-xl"
                                                                            disabled={
                                                                                confirmLoading || !isItemsPrepared() || !packingProgress.allPacked
                                                                            }
                                                                            onClick={submitConfirmOutbound}
                                                                        >
                                                                            {confirmLoading ? (
                                                                                <span className="loading loading-spinner loading-sm" />
                                                                            ) : (
                                                                                'Xác nhận xuất kho (trừ tồn — trạng thái: đã xuất kho)'
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </form>
                                                            </>
                                                        )}
                                                    </div>
                                                ) : expanded && !detailLoading ? (
                                                    <p className="py-6 text-center text-sm text-error">Không tải được chi tiết đơn.</p>
                                                ) : null}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
};

export default WarehouseOutboundScanPage;
