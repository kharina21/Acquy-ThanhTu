import React, { useEffect, useState, useMemo } from 'react';
import { ClipboardList, Plus, Eye, CheckCircle, X, Search } from 'lucide-react';
import {
    getNextStockCheckCode,
    getStockChecks,
    getStockCheckById,
    createStockCheck,
    confirmStockCheck,
} from '@/services/stockCheckService';
import { getProducts, getProductOptions } from '@/services/productService';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const StockCheckTab = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', brand: '', category: '' });
    const [productOptions, setProductOptions] = useState({ category: [], brand: [] });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCode, setCreateCode] = useState('');
    const [createNote, setCreateNote] = useState('');
    const [createRows, setCreateRows] = useState([]);
    const [productsForPick, setProductsForPick] = useState([]);
    const [showPickProduct, setShowPickProduct] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailStockCheck, setDetailStockCheck] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

    const fetchList = async (overridePage, overrideFilters) => {
        setLoading(true);
        const page = overridePage !== undefined ? overridePage : pagination.page;
        const f = overrideFilters !== undefined ? overrideFilters : filters;
        const params = { page, limit: pagination.limit };
        if (f.fromDate) params.fromDate = f.fromDate;
        if (f.toDate) params.toDate = f.toDate;
        if (f.brand) params.brand = f.brand;
        if (f.category) params.category = f.category;
        const res = await getStockChecks(params);
        if (res.success && res.data) {
            setList(res.data.stockChecks || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        const loadOptions = async () => {
            const res = await getProductOptions();
            if (res.success && res.data) setProductOptions(res.data);
        };
        loadOptions();
    }, []);

    useEffect(() => {
        fetchList();
    }, [pagination.page]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination((p) => ({ ...p, page: 1 }));
        fetchList(1);
    };

    const clearFilters = () => {
        const empty = { fromDate: '', toDate: '', brand: '', category: '' };
        setFilters(empty);
        setPagination((p) => ({ ...p, page: 1 }));
        fetchList(1, empty);
    };

    const openCreateModal = async () => {
        const code = await getNextStockCheckCode();
        setCreateCode(code || '');
        setCreateNote('');
        setCreateRows([]);
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateCode('');
        setCreateNote('');
        setCreateRows([]);
    };

    const loadProductsForPick = async () => {
        const res = await getProducts({ page: 1, limit: 200, search: '' });
        if (res.success && res.data?.products) {
            setProductsForPick(res.data.products);
            setShowPickProduct(true);
        }
    };

    const addProductToRows = (product) => {
        if (createRows.some((r) => r.product._id === product._id)) {
            toast.error('Sản phẩm đã có trong phiếu');
            return;
        }
        setCreateRows((prev) => [
            ...prev,
            {
                product,
                quantityBefore: product.quantity ?? 0,
                quantityCounted: product.quantity ?? 0,
            },
        ]);
        setShowPickProduct(false);
    };

    const updateRowCounted = (productId, value) => {
        const num = parseInt(value, 10);
        setCreateRows((prev) =>
            prev.map((r) =>
                r.product._id === productId ? { ...r, quantityCounted: isNaN(num) ? 0 : num } : r
            )
        );
    };

    const removeRow = (productId) => {
        setCreateRows((prev) => prev.filter((r) => r.product._id !== productId));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!createCode.trim()) {
            toast.error('Vui lòng nhập mã phiếu kiểm kho');
            return;
        }
        if (createRows.length === 0) {
            toast.error('Vui lòng thêm ít nhất một sản phẩm');
            return;
        }
        setSubmitting(true);
        try {
            await createStockCheck({
                code: createCode.trim(),
                note: createNote.trim(),
                items: createRows.map((r) => ({
                    productId: r.product._id,
                    quantityCounted: r.quantityCounted,
                })),
            });
            toast.success('Tạo phiếu kiểm kho thành công');
            closeCreateModal();
            fetchList();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Tạo phiếu thất bại';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const openDetail = async (id) => {
        const res = await getStockCheckById(id);
        if (res.success && res.data?.stockCheck) {
            setDetailStockCheck(res.data.stockCheck);
            setShowDetailModal(true);
        } else {
            toast.error('Không tải được chi tiết phiếu');
        }
    };

    const handleConfirm = (sc) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận phiếu kiểm kho',
            message: `Xác nhận phiếu ${sc.code} sẽ cập nhật tồn kho theo số lượng đếm thực tế. Bạn có chắc?`,
            onConfirm: async () => {
                try {
                    await confirmStockCheck(sc._id);
                    toast.success('Đã xác nhận phiếu và cập nhật tồn kho');
                    setShowDetailModal(false);
                    setDetailStockCheck(null);
                    fetchList();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xác nhận thất bại');
                }
            },
        });
    };

    const totalValueChange = detailStockCheck?.items?.reduce((s, it) => s + (it.valueChange || 0), 0) ?? 0;

    const optionCategories = useMemo(() => (productOptions.category || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)), [productOptions.category]);
    const optionBrands = useMemo(() => (productOptions.brand || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)), [productOptions.brand]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="label py-0"><span className="label-text text-sm">Từ ngày</span></label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.fromDate}
                            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="label py-0"><span className="label-text text-sm">Đến ngày</span></label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.toDate}
                            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                            min={filters.fromDate || undefined}
                        />
                    </div>
                    <div>
                        <label className="label py-0"><span className="label-text text-sm">Loại hàng</span></label>
                        <select
                            className="select select-bordered select-sm w-full min-w-[120px]"
                            value={filters.category}
                            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                        >
                            <option value="">— Tất cả —</option>
                            {optionCategories.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label py-0"><span className="label-text text-sm">Thương hiệu</span></label>
                        <select
                            className="select select-bordered select-sm w-full min-w-[120px]"
                            value={filters.brand}
                            onChange={(e) => setFilters((f) => ({ ...f, brand: e.target.value }))}
                        >
                            <option value="">— Tất cả —</option>
                            {optionBrands.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm gap-1">
                        <Search className="w-4 h-4" />
                        Tìm kiếm
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                        Xóa bộ lọc
                    </button>
                </form>
                <button type="button" className="btn btn-primary gap-2" onClick={openCreateModal}>
                    <Plus className="w-4 h-4" />
                    Tạo phiếu kiểm kho
                </button>
            </div>

            <div className="bg-base-100 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : list.length === 0 ? (
                    <div className="p-12 text-center text-base-content/60">
                        <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Chưa có phiếu kiểm kho. Bấm &quot;Tạo phiếu kiểm kho&quot; để tạo mới.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Mã phiếu</th>
                                    <th>Người tạo</th>
                                    <th>Ngày tạo</th>
                                    <th>Trạng thái</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {list.map((sc) => (
                                    <tr key={sc._id}>
                                        <td className="font-medium">{sc.code}</td>
                                        <td>
                                            {sc.createdBy
                                                ? `${sc.createdBy.firstName || ''} ${sc.createdBy.lastName || ''}`.trim() || sc.createdBy.username
                                                : '—'}
                                        </td>
                                        <td>{formatDate(sc.createdAt)}</td>
                                        <td>
                                            <span
                                                className={`badge badge-sm ${sc.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}
                                            >
                                                {sc.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm gap-1"
                                                onClick={() => openDetail(sc._id)}
                                            >
                                                <Eye className="w-4 h-4" />
                                                Xem
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && list.length > 0 && pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-base-200">
                        <p className="text-sm text-base-content/60">
                            Hiển thị {list.length} / {pagination.total} phiếu
                        </p>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >
                                «
                            </button>
                            <button className="join-item btn btn-sm">
                                Trang {pagination.page} / {pagination.totalPages}
                            </button>
                            <button
                                className="join-item btn btn-sm"
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal tạo phiếu kiểm kho */}
            {showCreateModal && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true">
                    <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4">Tạo phiếu kiểm kho</h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text font-semibold">Mã phiếu</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createCode}
                                        onChange={(e) => setCreateCode(e.target.value)}
                                        placeholder="KK-YYYYMMDD-001"
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Ghi chú</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createNote}
                                        onChange={(e) => setCreateNote(e.target.value)}
                                        placeholder="Tùy chọn"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="label"><span className="label-text font-semibold">Sản phẩm kiểm kho</span></label>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline gap-1"
                                        onClick={loadProductsForPick}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Thêm sản phẩm
                                    </button>
                                </div>
                                <div className="overflow-x-auto border border-base-300 rounded-lg">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Mã hàng</th>
                                                <th>Tên sản phẩm</th>
                                                <th className="text-right">Tồn kho (gốc)</th>
                                                <th className="text-right">Số lượng đếm</th>
                                                <th className="text-right">Chênh lệch</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {createRows.map((r) => {
                                                const change = r.quantityCounted - r.quantityBefore;
                                                return (
                                                    <tr key={r.product._id}>
                                                        <td className="font-medium">{r.product.sku}</td>
                                                        <td>{r.product.name}</td>
                                                        <td className="text-right">{r.quantityBefore}</td>
                                                        <td className="text-right">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="input input-bordered input-sm w-24 text-right"
                                                                value={r.quantityCounted}
                                                                onChange={(e) => updateRowCounted(r.product._id, e.target.value)}
                                                            />
                                                        </td>
                                                        <td className={`text-right font-medium ${change !== 0 ? (change > 0 ? 'text-success' : 'text-error') : ''}`}>
                                                            {change > 0 ? '+' : ''}{change}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-xs text-error"
                                                                onClick={() => removeRow(r.product._id)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {createRows.length === 0 && (
                                    <p className="text-base-content/50 text-sm py-4 text-center">Chưa thêm sản phẩm. Bấm &quot;Thêm sản phẩm&quot; để chọn.</p>
                                )}
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={closeCreateModal}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting || createRows.length === 0}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm" />
                                            Đang tạo...
                                        </>
                                    ) : (
                                        'Tạo phiếu'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={closeCreateModal}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal chọn sản phẩm */}
            {showPickProduct && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true">
                    <div className="modal-box max-w-2xl max-h-[80vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-4">Chọn sản phẩm</h3>
                        <ul className="menu bg-base-200 rounded-lg">
                            {productsForPick
                                .filter((p) => !createRows.some((r) => r.product._id === p._id))
                                .map((p) => (
                                    <li key={p._id}>
                                        <button type="button" onClick={() => addProductToRows(p)}>
                                            <span className="font-medium">{p.sku}</span> — {p.name} (tồn: {p.quantity ?? 0})
                                        </button>
                                    </li>
                                ))}
                        </ul>
                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={() => setShowPickProduct(false)}>
                                Đóng
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowPickProduct(false)}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal chi tiết phiếu kiểm kho */}
            {showDetailModal && detailStockCheck && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true">
                    <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg">Phiếu kiểm kho: {detailStockCheck.code}</h3>
                                <p className="text-sm text-base-content/60 mt-1">
                                    Người tạo: {detailStockCheck.createdBy ? `${detailStockCheck.createdBy.firstName || ''} ${detailStockCheck.createdBy.lastName || ''}`.trim() || detailStockCheck.createdBy.username : '—'} — {formatDate(detailStockCheck.createdAt)}
                                </p>
                                <span className={`badge badge-sm mt-2 ${detailStockCheck.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                    {detailStockCheck.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                </span>
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => { setShowDetailModal(false); setDetailStockCheck(null); }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {detailStockCheck.note ? <p className="text-sm mb-4">Ghi chú: {detailStockCheck.note}</p> : null}
                        <div className="overflow-x-auto border border-base-300 rounded-lg">
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Mã hàng</th>
                                        <th>Tên sản phẩm</th>
                                        <th className="text-right">Tồn kho (gốc)</th>
                                        <th className="text-right">Số đếm thực tế</th>
                                        <th className="text-right">Chênh lệch</th>
                                        <th className="text-right">Đơn giá</th>
                                        <th className="text-right">Giá trị chênh lệch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailStockCheck.items?.map((it) => (
                                        <tr key={it.product?._id || it.product}>
                                            <td className="font-medium">{it.product?.sku ?? '—'}</td>
                                            <td>{it.product?.name ?? '—'}</td>
                                            <td className="text-right">{it.quantityBefore}</td>
                                            <td className="text-right">{it.quantityCounted}</td>
                                            <td className={`text-right font-medium ${it.quantityChange !== 0 ? (it.quantityChange > 0 ? 'text-success' : 'text-error') : ''}`}>
                                                {it.quantityChange > 0 ? '+' : ''}{it.quantityChange}
                                            </td>
                                            <td className="text-right">{formatVND(it.unitPrice)}</td>
                                            <td className="text-right">{formatVND(it.valueChange)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-4">
                            <p className="font-semibold">Tổng giá trị chênh lệch: {formatVND(totalValueChange)}</p>
                        </div>
                        {detailStockCheck.status === 'draft' && (
                            <div className="modal-action mt-4">
                                <button
                                    type="button"
                                    className="btn btn-primary gap-2"
                                    onClick={() => handleConfirm(detailStockCheck)}
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Xác nhận và cập nhật tồn kho
                                </button>
                            </div>
                        )}
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => { setShowDetailModal(false); setDetailStockCheck(null); }}>Đóng</button>
                    </form>
                </dialog>
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Xác nhận"
                cancelText="Hủy"
                variant="warning"
            />
        </div>
    );
};

export default StockCheckTab;
