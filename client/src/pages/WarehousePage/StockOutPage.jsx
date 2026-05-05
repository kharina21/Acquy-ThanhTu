import React, { useEffect, useState, useRef } from 'react';
import ModalPortal from '@/components/common/ModalPortal';
import { Package, Search, CheckCircle, X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { getNextStockOutCode, getStockOuts, createStockOut, deleteStockOut, confirmStockOut } from '@/services/stockOutService';
import { getProducts } from '@/services/productService';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { FilterToolbar, FilterToolbarActions, FilterToolbarField } from '@/components/common/FilterToolbar';
import { toast } from 'sonner';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

/** Ngày chứng từ mặc định (YYYY-MM-DD) — local */
const todayInputDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

/** Loại xuất — phiếu nhập tay (không gồm sale_order; đơn hàng do hệ thống tạo) */
const MANUAL_REASON_OPTIONS = [
    { value: 'adjustment', label: 'Điều chỉnh / đối soát tồn' },
    { value: 'internal_use', label: 'Xuất nội bộ / dùng nội bộ' },
    { value: 'damage_loss', label: 'Xuất hủy / hỏng / mất' },
    { value: 'supplier_return', label: 'Trả nhà cung cấp' },
    { value: 'other', label: 'Khác' },
];

const MANUAL_REASON_LABEL = Object.fromEntries(MANUAL_REASON_OPTIONS.map((o) => [o.value, o.label]));

const formatStockOutDisplayDate = (row) => {
    const raw = row.documentDate || row.createdAt;
    if (!raw) return '—';
    return new Date(raw).toLocaleString('vi-VN');
};

const StockOutPage = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', status: '', code: '', saleChannel: '', reasonType: '' });
    const [debouncedCode, setDebouncedCode] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCode, setCreateCode] = useState('');
    const [createLocationId, setCreateLocationId] = useState('');
    const [createNote, setCreateNote] = useState('');
    const [createDocumentDate, setCreateDocumentDate] = useState('');
    const [createReasonType, setCreateReasonType] = useState('adjustment');
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
    const locations = useBranchStore((s) => s.locations);
    const fetchLocations = useBranchStore((s) => s.fetchLocations);
    const { isAdmin } = useUserRole();

    /** Chỉ chi nhánh được phân quyền (admin: tất cả; khác: scope mine) */
    useEffect(() => {
        fetchLocations({ scope: isAdmin ? undefined : 'mine' });
    }, [isAdmin, fetchLocations]);

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
        if (filters.reasonType) params.reasonType = filters.reasonType;

        const res = await getStockOuts(params);
        if (res.success && res.data) {
            setList(res.data.stockOuts || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedCode(filters.code), 300);
        return () => clearTimeout(t);
    }, [filters.code]);

    useEffect(() => {
        fetchList();
    }, [pagination.page, filters.fromDate, filters.toDate, filters.status, filters.saleChannel, filters.reasonType, debouncedCode, currentLocationId]);

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
        let locId = currentLocationId || '';
        if (!locId || !locations.some((l) => l._id === locId)) {
            locId = locations[0]?._id || '';
        }
        setCreateLocationId(locId);
        setCreateNote('');
        setCreateDocumentDate(todayInputDate());
        setCreateReasonType('adjustment');
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
                reasonType: createReasonType,
                documentDate: createDocumentDate?.trim() ? createDocumentDate : undefined,
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
                <div className="flex items-center gap-2">
                    <Package className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold text-base-content">Xuất kho</h1>
                </div>

                <div className="rounded-xl border border-base-200 bg-base-100 p-4">
                    <FilterToolbar>
                        <FilterToolbarField label="Từ ngày">
                            <input
                                type="date"
                                className="input input-bordered input-sm"
                                value={filters.fromDate}
                                onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                            />
                        </FilterToolbarField>
                        <FilterToolbarField label="Đến ngày">
                            <input
                                type="date"
                                className="input input-bordered input-sm"
                                value={filters.toDate}
                                onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                            />
                        </FilterToolbarField>
                        <FilterToolbarField label="Trạng thái">
                            <select
                                className="select select-bordered select-sm"
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                            >
                                <option value="">Tất cả</option>
                                <option value="draft">Nháp</option>
                                <option value="confirmed">Đã xác nhận</option>
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label="Loại xuất">
                            <select
                                className="select select-bordered select-sm min-w-[200px]"
                                value={filters.reasonType}
                                onChange={(e) => setFilters((f) => ({ ...f, reasonType: e.target.value }))}
                            >
                                <option value="">Tất cả</option>
                                <option value="sale_order">Theo đơn hàng</option>
                                {MANUAL_REASON_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label="Kênh xuất">
                            <select
                                className="select select-bordered select-sm min-w-40"
                                value={filters.saleChannel}
                                onChange={(e) => setFilters((f) => ({ ...f, saleChannel: e.target.value }))}
                            >
                                <option value="">Tất cả</option>
                                <option value="offline">Tại quầy (tự động)</option>
                                <option value="online">Online (xác nhận tay)</option>
                            </select>
                        </FilterToolbarField>
                        <FilterToolbarField label="Mã phiếu" className="min-w-[140px] flex-1">
                            <input
                                type="text"
                                className="input input-bordered input-sm w-full"
                                placeholder="XK-..."
                                value={filters.code}
                                onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
                            />
                        </FilterToolbarField>
                        <FilterToolbarActions>
                            <button type="button" className="btn btn-primary btn-sm gap-1" onClick={openCreate}>
                                <Plus className="h-4 w-4" /> Tạo phiếu xuất
                            </button>
                        </FilterToolbarActions>
                    </FilterToolbar>
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
                                        <th>Ngày (CT / tạo)</th>
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
                                                                    ? 'Đơn hàng · tại quầy'
                                                                    : row.saleChannel === 'online'
                                                                      ? 'Đơn hàng · online'
                                                                      : 'Đơn hàng'}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className={`badge badge-sm ${
                                                                    row.reasonType === 'damage_loss' ? 'badge-warning' : 'badge-ghost'
                                                                }`}
                                                            >
                                                                {MANUAL_REASON_LABEL[row.reasonType] || MANUAL_REASON_LABEL.other}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-sm ${row.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                                            {row.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs">
                                                        <span>{formatStockOutDisplayDate(row)}</span>
                                                        <span className="block text-[10px] text-base-content/50 mt-0.5">
                                                            {row.documentDate ? 'Ngày chứng từ' : 'Ngày tạo phiếu'}
                                                        </span>
                                                    </td>
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
                <ModalPortal>
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center p-4 pointer-events-none"
                    data-theme="light"
                >
                    <div
                        role="presentation"
                        className="pointer-events-auto absolute inset-0 min-h-dvh bg-neutral-900/50"
                        onClick={() => setShowCreateModal(false)}
                        aria-hidden
                    />
                    <div className="pointer-events-auto relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-box border border-base-300 bg-base-100 p-6 text-base-content shadow-2xl">
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
                                                {l.code ? `${l.code} — ${l.name}` : l.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="label py-0 text-xs flex flex-wrap items-center gap-2">
                                        Ngày chứng từ
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs h-6 min-h-0 px-2"
                                            onClick={() => setCreateDocumentDate(todayInputDate())}
                                        >
                                            Hôm nay
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-base-content/60"
                                            onClick={() => setCreateDocumentDate('')}
                                        >
                                            Bỏ ngày CT
                                        </button>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered input-sm w-full"
                                        value={createDocumentDate}
                                        onChange={(e) => setCreateDocumentDate(e.target.value)}
                                    />
                                    <p className="text-[11px] text-base-content/50 mt-1">
                                        Chọn ngày trên phiếu giấy (nhập tài liệu cũ). Để trống nếu chỉ cần ngày tạo phiếu trên hệ thống.
                                    </p>
                                </div>
                                <div>
                                    <label className="label py-0 text-xs">Loại xuất *</label>
                                    <select
                                        className="select select-bordered select-sm w-full"
                                        required
                                        value={createReasonType}
                                        onChange={(e) => setCreateReasonType(e.target.value)}
                                    >
                                        {MANUAL_REASON_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
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
                            <div className="modal-action mt-4">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? <span className="loading loading-spinner loading-sm" /> : 'Lưu nháp'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                </ModalPortal>
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
