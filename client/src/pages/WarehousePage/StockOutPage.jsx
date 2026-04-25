import React, { useEffect, useState, useRef } from 'react';
import { Package, Search, CheckCircle, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getNextStockOutCode, getStockOuts, createStockOut, deleteStockOut, confirmStockOut } from '@/services/stockOutService';
import { getProducts } from '@/services/productService';
import { getLocations } from '@/services/locationService';
import { useBranchStore } from '@/stores/useBranchStore';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const StockOutPage = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', status: '', code: '', saleChannel: '' });
    const [debouncedCode, setDebouncedCode] = useState('');
    const [locations, setLocations] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCode, setCreateCode] = useState('');
    const [createLocationId, setCreateLocationId] = useState('');
    const [createNote, setCreateNote] = useState('');
    const [createRows, setCreateRows] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [productSearchResults, setProductSearchResults] = useState([]);
    const [productSearchLoading, setProductSearchLoading] = useState(false);
    const [productSearchOpen, setProductSearchOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const productSearchRef = useRef(null);
    const [expandedId, setExpandedId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

    const currentLocationId = useBranchStore((s) => s.currentLocationId);

    const fetchList = async (overridePage) => {
        setLoading(true);
        const page = overridePage !== undefined ? overridePage : pagination.page;
        const params = { page, limit: pagination.limit };
        if (currentLocationId) params.locationId = currentLocationId;
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;
        if (filters.status) params.status = filters.status;
        if (debouncedCode?.trim()) params.code = debouncedCode.trim();
        if (filters.saleChannel === 'online' || filters.saleChannel === 'offline') params.saleChannel = filters.saleChannel;

        const res = await getStockOuts(params);
        if (res.success && res.data) {
            setList(res.data.stockOuts || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        getLocations().then((res) => {
            if (res.success && res.data?.locations) {
                setLocations((res.data.locations || []).filter((l) => l.isActive !== false));
            }
        });
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedCode(filters.code), 300);
        return () => clearTimeout(t);
    }, [filters.code]);

    useEffect(() => {
        fetchList();
    }, [pagination.page, filters.fromDate, filters.toDate, filters.status, filters.saleChannel, debouncedCode, currentLocationId]);

    useEffect(() => {
        if (!productSearchOpen || productSearch.trim().length < 1) {
            setProductSearchResults([]);
            return;
        }
        let cancelled = false;
        setProductSearchLoading(true);
        getProducts({ search: productSearch.trim(), limit: 15, page: 1 })
            .then((res) => {
                if (!cancelled && res.success) setProductSearchResults(res.data?.products || []);
            })
            .finally(() => {
                if (!cancelled) setProductSearchLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [productSearch, productSearchOpen]);

    const openCreate = async () => {
        const code = (await getNextStockOutCode()) || '';
        setCreateCode(code);
        setCreateLocationId(currentLocationId || '');
        setCreateNote('');
        setCreateRows([]);
        setShowCreateModal(true);
    };

    const addProductRow = (p) => {
        if (!p?._id) return;
        if (createRows.some((r) => r.product === p._id)) {
            toast.info('Sản phẩm đã có trong phiếu');
            return;
        }
        setCreateRows((rows) => [
            ...rows,
            {
                product: p._id,
                productName: p.name,
                sku: p.sku,
                quantity: 1,
                unitPrice: Number(p.costPrice) || Number(p.price) || 0,
            },
        ]);
        setProductSearch('');
        setProductSearchOpen(false);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!createLocationId) {
            toast.error('Chọn chi nhánh');
            return;
        }
        if (!createRows.length) {
            toast.error('Thêm ít nhất một sản phẩm');
            return;
        }
        setSubmitting(true);
        try {
            const items = createRows.map((r) => ({
                product: r.product,
                quantity: Math.max(1, parseInt(r.quantity, 10) || 1),
                unitPrice: Number(r.unitPrice) || 0,
            }));
            const res = await createStockOut({
                code: createCode.trim() || undefined,
                location: createLocationId,
                note: createNote,
                items,
                reasonType: 'other',
            });
            if (res.success) {
                toast.success('Đã tạo phiếu xuất (nháp)');
                setShowCreateModal(false);
                fetchList(1);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không tạo được phiếu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirm = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận xuất kho',
            message: 'Trừ tồn kho theo phiếu này?',
            onConfirm: async () => {
                try {
                    const res = await confirmStockOut(id);
                    if (res.success) {
                        toast.success('Đã xác nhận xuất kho');
                        fetchList();
                    }
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Lỗi xác nhận');
                }
            },
        });
    };

    const handleDeleteDraft = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa phiếu nháp',
            message: 'Xóa phiếu xuất chưa xác nhận?',
            onConfirm: async () => {
                try {
                    await deleteStockOut(id);
                    toast.success('Đã xóa');
                    fetchList();
                } catch (err) {
                    toast.error(err.response?.data?.message || 'Không xóa được');
                }
            },
        });
    };

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Package className="w-8 h-8 text-primary" />
                            <h1 className="text-2xl font-bold text-base-content">Xuất kho</h1>
                        </div>
                        <p className="text-sm text-base-content/65 max-w-2xl mt-1 pl-10">
                            Bán online & bán tại quầy: phiếu xuất theo đơn bán được tạo khi nhân viên kho xác nhận xuất (sau khi quét đủ dòng).
                        </p>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm gap-1" onClick={openCreate}>
                        <Plus className="w-4 h-4" /> Tạo phiếu xuất
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 items-end bg-base-100 p-4 rounded-xl border border-base-200">
                    <div>
                        <label className="label py-0 text-xs">Từ ngày</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={filters.fromDate}
                            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Đến ngày</label>
                        <input
                            type="date"
                            className="input input-bordered input-sm"
                            value={filters.toDate}
                            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Trạng thái</label>
                        <select
                            className="select select-bordered select-sm"
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">Tất cả</option>
                            <option value="draft">Nháp</option>
                            <option value="confirmed">Đã xác nhận</option>
                        </select>
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Kênh xuất</label>
                        <select
                            className="select select-bordered select-sm min-w-40"
                            value={filters.saleChannel}
                            onChange={(e) => setFilters((f) => ({ ...f, saleChannel: e.target.value }))}
                        >
                            <option value="">Tất cả</option>
                            <option value="offline">Tại quầy (tự động)</option>
                            <option value="online">Online (xác nhận tay)</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                        <label className="label py-0 text-xs">Mã phiếu</label>
                        <input
                            type="text"
                            className="input input-bordered input-sm w-full"
                            placeholder="XK-..."
                            value={filters.code}
                            onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="bg-base-100 rounded-xl border border-base-200 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <span className="loading loading-spinner loading-lg text-primary" />
                        </div>
                    ) : list.length === 0 ? (
                        <p className="text-center py-12 text-base-content/60">Chưa có phiếu xuất</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-sm">
                                <thead>
                                    <tr className="bg-base-200">
                                        <th className="w-8" />
                                        <th>Mã</th>
                                        <th>Chi nhánh</th>
                                        <th>Kênh / loại</th>
                                        <th>Trạng thái</th>
                                        <th>Ngày</th>
                                        <th className="text-right">Thành tiền</th>
                                        <th className="text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {list.map((row) => {
                                        const exp = expandedId === row._id;
                                        return (
                                            <React.Fragment key={row._id}>
                                                <tr className="hover:bg-base-200/50 cursor-pointer" onClick={() => setExpandedId(exp ? null : row._id)}>
                                                    <td>{exp ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</td>
                                                    <td className="font-mono font-medium">{row.code}</td>
                                                    <td>{row.location?.name || '—'}</td>
                                                    <td>
                                                        {row.reasonType === 'sale_order' ? (
                                                            <span
                                                                className={`badge badge-sm ${
                                                                    row.saleChannel === 'offline' ? 'badge-info' : 'badge-secondary'
                                                                }`}
                                                            >
                                                                {row.saleChannel === 'offline'
                                                                    ? 'Tại quầy · tự động'
                                                                    : row.saleChannel === 'online'
                                                                      ? 'Online · xác nhận tay'
                                                                      : 'Online · xác nhận tay'}
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-ghost badge-sm">Điều chỉnh / khác</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${row.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                                            {row.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs">{row.createdAt ? new Date(row.createdAt).toLocaleString('vi-VN') : '—'}</td>
                                                    <td className="text-right font-medium">{formatVND(row.totalAmount)}</td>
                                                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                                        {row.status === 'draft' && row.reasonType !== 'sale_order' && (
                                                            <div className="flex gap-1 justify-end">
                                                                <button type="button" className="btn btn-xs btn-success gap-0" onClick={() => handleConfirm(row._id)}>
                                                                    <CheckCircle className="w-3 h-3" />
                                                                </button>
                                                                <button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => handleDeleteDraft(row._id)}>
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                                {exp && (
                                                    <tr>
                                                        <td colSpan={8} className="bg-base-200/30 text-sm p-0">
                                                            <div className="p-4 space-y-3 border-t border-base-200">
                                                                {row.order?.code && (
                                                                    <p className="font-medium">
                                                                        <span className="text-base-content/60 font-normal">Đơn hàng:</span>{' '}
                                                                        {row.order.code}
                                                                    </p>
                                                                )}
                                                                {row.note?.trim() && (
                                                                    <p className="text-xs text-base-content/55 mt-1">{row.note}</p>
                                                                )}

                                                                <div>
                                                                    <p className="text-xs font-semibold uppercase tracking-wide text-base-content/50 mb-2">
                                                                        Chi tiết sản phẩm
                                                                    </p>
                                                                    {Array.isArray(row.items) && row.items.length > 0 ? (
                                                                        <div className="overflow-x-auto rounded-lg border border-base-200 bg-base-100">
                                                                            <table className="table table-sm">
                                                                                <thead>
                                                                                    <tr className="bg-base-200/80">
                                                                                        <th className="w-14">Ảnh</th>
                                                                                        <th>Sản phẩm</th>
                                                                                        <th className="whitespace-nowrap">SKU</th>
                                                                                        <th className="text-right w-20">SL</th>
                                                                                        <th className="text-right whitespace-nowrap">Đơn giá</th>
                                                                                        <th className="text-right whitespace-nowrap">Thành tiền</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {row.items.map((it) => {
                                                                                        const p = it.product;
                                                                                        const name = p?.name || '—';
                                                                                        const sku = p?.sku || '—';
                                                                                        const img =
                                                                                            p?.images?.[0] || p?.image || null;
                                                                                        const qty = it.quantity ?? 0;
                                                                                        const unit = it.unitPrice ?? 0;
                                                                                        const lineTotal =
                                                                                            it.totalPrice != null
                                                                                                ? it.totalPrice
                                                                                                : qty * unit;
                                                                                        return (
                                                                                            <tr key={it._id || `${sku}-${qty}`}>
                                                                                                <td>
                                                                                                    <div className="w-10 h-10 rounded bg-base-200 overflow-hidden flex items-center justify-center">
                                                                                                        {img ? (
                                                                                                            <img
                                                                                                                src={img}
                                                                                                                alt=""
                                                                                                                className="w-full h-full object-contain"
                                                                                                            />
                                                                                                        ) : (
                                                                                                            <Package className="w-4 h-4 text-base-content/30" />
                                                                                                        )}
                                                                                                    </div>
                                                                                                </td>
                                                                                                <td className="font-medium max-w-[200px]">
                                                                                                    <span className="line-clamp-2">{name}</span>
                                                                                                </td>
                                                                                                <td className="font-mono text-xs">{sku}</td>
                                                                                                <td className="text-right">{qty}</td>
                                                                                                <td className="text-right text-xs">{formatVND(unit)}</td>
                                                                                                <td className="text-right font-medium">{formatVND(lineTotal)}</td>
                                                                                            </tr>
                                                                                        );
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-base-content/55 text-sm py-2">Không có dòng sản phẩm trên phiếu.</p>
                                                                    )}
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
                    )}
                </div>
            </div>

            {showCreateModal && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
                        <button
                            type="button"
                            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                            onClick={() => setShowCreateModal(false)}
                            aria-label="Đóng"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <h3 className="font-bold text-lg mb-4">Tạo phiếu xuất kho (nháp)</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="label py-0 text-xs">Mã phiếu</label>
                                    <input className="input input-bordered input-sm w-full" value={createCode} onChange={(e) => setCreateCode(e.target.value)} />
                                </div>
                                <div>
                                    <label className="label py-0 text-xs">Chi nhánh *</label>
                                    <select
                                        className="select select-bordered select-sm w-full"
                                        required
                                        value={createLocationId}
                                        onChange={(e) => setCreateLocationId(e.target.value)}
                                    >
                                        <option value="">—</option>
                                        {locations.map((l) => (
                                            <option key={l._id} value={l._id}>
                                                {l.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label py-0 text-xs">Ghi chú</label>
                                <input className="input input-bordered input-sm w-full" value={createNote} onChange={(e) => setCreateNote(e.target.value)} />
                            </div>
                            <div className="relative" ref={productSearchRef}>
                                <label className="label py-0 text-xs">Thêm sản phẩm</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-2 top-2.5 text-base-content/40" />
                                        <input
                                            className="input input-bordered input-sm w-full pl-8"
                                            placeholder="Tìm SKU / tên..."
                                            value={productSearch}
                                            onChange={(e) => {
                                                setProductSearch(e.target.value);
                                                setProductSearchOpen(true);
                                            }}
                                            onFocus={() => setProductSearchOpen(true)}
                                        />
                                        {productSearchOpen && (productSearchResults.length > 0 || productSearchLoading) && (
                                            <ul className="absolute z-30 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow max-h-48 overflow-y-auto">
                                                {productSearchLoading && <li className="px-3 py-2 text-sm">Đang tìm…</li>}
                                                {!productSearchLoading &&
                                                    productSearchResults.map((p) => (
                                                        <li key={p._id}>
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-base-200"
                                                                onClick={() => addProductRow(p)}
                                                            >
                                                                {p.sku} — {p.name}
                                                            </button>
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {createRows.length === 0 ? (
                                    <p className="p-3 text-sm text-base-content/60">Chưa có dòng hàng</p>
                                ) : (
                                    createRows.map((r, idx) => (
                                        <div key={r.product} className="flex flex-wrap gap-2 items-center p-2 text-sm">
                                            <span className="flex-1 min-w-[120px] font-medium">{r.sku}</span>
                                            <span className="flex-1 min-w-[140px]">{r.productName}</span>
                                            <input
                                                type="number"
                                                min={1}
                                                className="input input-bordered input-xs w-20"
                                                value={r.quantity}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setCreateRows((rows) => rows.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                                                }}
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                className="input input-bordered input-xs w-28"
                                                value={r.unitPrice}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setCreateRows((rows) => rows.map((x, i) => (i === idx ? { ...x, unitPrice: v } : x)));
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs text-error"
                                                onClick={() => setCreateRows((rows) => rows.filter((_, i) => i !== idx))}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Lưu nháp'}
                                </button>
                            </div>
                        </form>
                    </div>
                    <button type="button" className="modal-backdrop bg-black/40" onClick={() => setShowCreateModal(false)} aria-label="Đóng" />
                </div>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default StockOutPage;
