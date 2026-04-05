import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router';
import { ScanLine, ChevronDown } from 'lucide-react';
import { getOnlineLocation } from '@/services/locationService';
import {
    getMyOrders,
    lookupOnlineOrderForPacking,
    packWarehouseOrderLine,
    confirmWarehouseOutbound,
} from '@/services/orderService';
import { toast } from 'sonner';

/**
 * Xuất kho nhanh: danh sách đơn chờ → bấm mở từng đơn → quét SKU từng dòng → xác nhận xuất kho.
 */
const WarehouseOutboundScanPage = () => {
    const [onlineInfo, setOnlineInfo] = useState({ location: null, resolvedAs: null });
    const [onlineLoading, setOnlineLoading] = useState(true);
    const onlineLocation = onlineInfo.location;

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

    const loadQueue = async () => {
        if (!onlineLocation?._id) {
            setQueue([]);
            return;
        }
        setQueueLoading(true);
        try {
            const res = await getMyOrders({
                warehouseQueue: true,
                limit: 50,
                page: 1,
            });
            setQueue(res?.data?.orders || []);
        } catch {
            toast.error('Không tải được hàng chờ xuất');
        } finally {
            setQueueLoading(false);
        }
    };

    useEffect(() => {
        loadQueue();
    }, [onlineLocation?._id]);

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

    const submitConfirmOutbound = async () => {
        if (!activeOrder?._id) return;
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

    /** Chi tiết đơn dùng cho panel (ưu tiên activeOrder sau khi lookup). */
    const OrderDetailCard = ({ order: ord }) => {
        if (!ord) return null;
        const addr = shippingAddressBlock(ord);
        return (
            <div className="rounded-lg border border-base-200 bg-base-100 p-3 space-y-2 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">Chi tiết đơn hàng</p>
                <div className="grid gap-2 sm:grid-cols-2">
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
                    <div className="pt-2 border-t border-base-200">
                        <span className="text-base-content/55 text-xs block mb-1">Sản phẩm trong đơn</span>
                        <ul className="space-y-1 text-xs">
                            {ord.items.map((it, idx) => {
                                const p = it.product;
                                const name = p?.name || 'Sản phẩm';
                                const sku = p?.sku ? ` · SKU ${p.sku}` : '';
                                return (
                                    <li key={idx} className="flex justify-between gap-2">
                                        <span className="min-w-0 truncate">
                                            {name}
                                            <span className="text-base-content/55">{sku}</span>
                                        </span>
                                        <span className="shrink-0 font-medium">×{it.quantity || 0}</span>
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
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto max-w-3xl space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ScanLine className="w-8 h-8 text-primary" />
                        <div>
                            <h1 className="text-2xl font-bold text-base-content">Xuất kho nhanh (đơn online)</h1>
                            <p className="text-sm text-base-content/65 mt-0.5">
                                Chọn đơn trong danh sách để mở các bước: quét SKU/mã vạch từng dòng đóng gói, sau đó xác
                                nhận xuất kho. Chỉ áp dụng cho <strong>chi nhánh bán online</strong> (đã thanh toán,
                                seller đã xác nhận).
                            </p>
                        </div>
                    </div>
                    <Link to="/admin/warehouses/stock-out" className="btn btn-ghost btn-sm">
                        Phiếu xuất kho
                    </Link>
                </div>

                <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-base-200 space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <h2 className="font-semibold">Đơn chờ xuất kho</h2>
                            <button type="button" className="btn btn-ghost btn-xs" onClick={loadQueue} disabled={queueLoading}>
                                {queueLoading ? <span className="loading loading-spinner loading-xs" /> : 'Làm mới'}
                            </button>
                        </div>
                        <div className="text-xs text-base-content/60">
                            <span className="label-text">Chi nhánh bán online:</span>{' '}
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
                                <span className="text-error">Chưa cấu hình</span>
                            )}
                        </div>
                    </div>

                    {!onlineLocation?._id ? (
                        <p className="p-6 text-sm text-base-content/60">
                            Cấu hình chi nhánh bán online trong quản lý cơ sở để xem danh sách.
                        </p>
                    ) : queueLoading && queue.length === 0 ? (
                        <div className="flex justify-center py-16">
                            <span className="loading loading-spinner text-primary" />
                        </div>
                    ) : queue.length === 0 ? (
                        <p className="p-6 text-sm text-base-content/60">Không có đơn nào đang chờ xuất kho.</p>
                    ) : (
                        <ul className="divide-y divide-base-200 text-sm max-h-[min(70vh,640px)] overflow-y-auto">
                            {queue.map((o) => {
                                const expanded = openOrderId === o._id;
                                const isActive =
                                    expanded &&
                                    activeOrder &&
                                    String(activeOrder._id) === String(o._id);
                                const addrPreview = shippingAddressBlock(o);
                                return (
                                    <li key={o._id} className="bg-base-100">
                                        <button
                                            type="button"
                                            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-base-200/60 transition-colors"
                                            onClick={() => handleToggleOrder(o._id)}
                                        >
                                            <ChevronDown
                                                className={`w-5 h-5 shrink-0 text-base-content/50 transition-transform ${
                                                    expanded ? 'rotate-180' : ''
                                                }`}
                                                aria-hidden
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-mono font-semibold text-base-content">{o.code}</p>
                                                <p className="text-xs text-base-content/65 mt-0.5">
                                                    <span>{formatOrderDate(o)}</span>
                                                    <span className="text-base-content/40 mx-1">·</span>
                                                    <span className="font-medium text-base-content/80">
                                                        {formatMoney(o.totalAmount)}
                                                    </span>
                                                </p>
                                                <p className="text-xs text-base-content/55 truncate mt-0.5">
                                                    {customerLabel(o)}
                                                    <span className="text-base-content/40 mx-1">·</span>
                                                    {itemCount(o)} sản phẩm
                                                    {addrPreview ? (
                                                        <>
                                                            <span className="text-base-content/40 mx-1">·</span>
                                                            <span className="italic">{addrPreview}</span>
                                                        </>
                                                    ) : null}
                                                </p>
                                            </div>
                                            <span className="badge badge-warning badge-sm shrink-0">Chờ xuất</span>
                                        </button>

                                        {expanded && (
                                            <div className="px-4 pb-4 pt-0 border-t border-base-200 bg-base-200/30">
                                                {detailLoading && !isActive ? (
                                                    <div className="flex justify-center py-8">
                                                        <span className="loading loading-spinner text-primary" />
                                                    </div>
                                                ) : isActive && packingProgress && activeOrder ? (
                                                    <div className="space-y-3 pt-3">
                                                        <OrderDetailCard order={activeOrder} />
                                                        <p className="text-xs font-medium text-base-content/80 pt-1">
                                                            Đóng gói & xuất kho
                                                        </p>
                                                        <p className="text-xs text-base-content/70">
                                                            Đóng gói: {packingProgress.packedCount}/{packingProgress.totalLines}{' '}
                                                            dòng
                                                            {packingProgress.allPacked && (
                                                                <span className="ml-2 badge badge-success badge-sm">
                                                                    Đủ — có thể xuất kho
                                                                </span>
                                                            )}
                                                        </p>

                                                        <ul className="rounded-lg border border-base-200 divide-y divide-base-200 bg-base-100 text-sm max-h-48 overflow-y-auto">
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

                                                        <form onSubmit={submitPackLine} className="space-y-2">
                                                            <label className="label py-0 text-xs font-medium">
                                                                Quét SKU / mã vạch (dòng chưa đóng gói)
                                                            </label>
                                                            <input
                                                                ref={skuInputRef}
                                                                type="text"
                                                                className="input input-bordered input-sm w-full font-mono"
                                                                placeholder="Quét sản phẩm vừa cho vào thùng"
                                                                value={scanSku}
                                                                onChange={(e) => setScanSku(e.target.value)}
                                                                autoComplete="off"
                                                                disabled={!onlineLocation?._id || packingProgress.allPacked}
                                                            />
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    type="submit"
                                                                    className="btn btn-primary btn-sm"
                                                                    disabled={
                                                                        packLoading ||
                                                                        !onlineLocation?._id ||
                                                                        packingProgress.allPacked
                                                                    }
                                                                >
                                                                    {packLoading ? (
                                                                        <span className="loading loading-spinner loading-sm" />
                                                                    ) : (
                                                                        'Xác nhận đóng gói dòng'
                                                                    )}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-success btn-sm"
                                                                    disabled={confirmLoading || !packingProgress.allPacked}
                                                                    onClick={submitConfirmOutbound}
                                                                >
                                                                    {confirmLoading ? (
                                                                        <span className="loading loading-spinner loading-sm" />
                                                                    ) : (
                                                                        'Xác nhận xuất kho (trừ tồn)'
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                ) : expanded && !detailLoading ? (
                                                    <p className="text-sm text-error py-4">Không tải được chi tiết đơn.</p>
                                                ) : null}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarehouseOutboundScanPage;
