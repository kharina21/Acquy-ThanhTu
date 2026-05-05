import React, { useEffect, useState, useMemo } from 'react';
import { ClipboardList, Plus, Eye, CheckCircle, X, Search, Printer, Trash2, Save, RotateCcw } from 'lucide-react';
import {
    getNextStockCheckCode,
    getStockChecks,
    getStockCheckById,
    createStockCheck,
    updateStockCheck,
    confirmStockCheck,
    reopenStockCheck,
    deleteStockCheck,
} from '@/services/stockCheckService';
import { getProducts, getProductOptions } from '@/services/productService';
import { getLocations } from '@/services/locationService';
import { useBranchStore } from '@/stores/useBranchStore';
import { useUserRole } from '@/hooks/useUserRole';
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

/** Ngày trên phiếu (YYYY-MM-DD) hoặc suy ra từ ngày tạo bản ghi cũ */
const ymdFromStockCheck = (sc) => {
    if (sc?.documentDate && /^\d{4}-\d{2}-\d{2}$/.test(sc.documentDate)) return sc.documentDate;
    if (!sc?.createdAt) return '';
    const dt = new Date(sc.createdAt);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const formatYmdVi = (ymd) => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
    const [y, m, d] = ymd.split('-');
    return `${d}/${m}/${y}`;
};

const htmlEscape = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const StockCheckTab = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', brand: '', category: '' });
    const [productOptions, setProductOptions] = useState({ category: [], brand: [] });
    const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
    const [brandDropdownOpen, setBrandDropdownOpen] = useState(false);
    const [categorySearch, setCategorySearch] = useState('');
    const [brandSearch, setBrandSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCode, setCreateCode] = useState('');
    const [createLocationId, setCreateLocationId] = useState('');
    const [locations, setLocations] = useState([]);
    const [createNote, setCreateNote] = useState('');
    /** Ngày trên phiếu (YYYY-MM-DD), mặc định hôm nay — đổi ngày sẽ gợi ý lại mã KK-… */
    const [createDocumentDate, setCreateDocumentDate] = useState('');
    const [createRows, setCreateRows] = useState([]);
    const [productsForPick, setProductsForPick] = useState([]);
    const [showPickProduct, setShowPickProduct] = useState(false);
    const [pickSearch, setPickSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [detailStockCheck, setDetailStockCheck] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
    /** Chỉnh số đếm trong modal chi tiết (nháp): key = _id dòng item */
    const [detailCountDraft, setDetailCountDraft] = useState({});
    /** Ghi chú tình trạng hàng (nháp): key = _id dòng item */
    const [detailConditionDraft, setDetailConditionDraft] = useState({});
    const [savingDetailCounts, setSavingDetailCounts] = useState(false);
    const [reopenSubmitting, setReopenSubmitting] = useState(false);
    /** Ghi chú toàn phiếu khi nháp (đồng bộ khi lưu) */
    const [detailNoteDraft, setDetailNoteDraft] = useState('');
    const [detailDocumentDateDraft, setDetailDocumentDateDraft] = useState('');

    // Ngày hôm nay (YYYY-MM-DD, giờ địa phương) — lọc & ngày phiếu tối đa
    const todayStr = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    })();

    const currentLocationId = useBranchStore((s) => s.currentLocationId);
    const { hasAnyRole } = useUserRole();

    const fetchList = async (overridePage, overrideFilters) => {
        setLoading(true);
        const page = overridePage !== undefined ? overridePage : pagination.page;
        const f = overrideFilters !== undefined ? overrideFilters : filters;
        const params = { page, limit: pagination.limit };
        if (currentLocationId) params.locationId = currentLocationId;
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, filters, currentLocationId]);

    const clearFilters = () => {
        const empty = { fromDate: '', toDate: '', brand: '', category: '' };
        setFilters(empty);
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const openCreateModal = async () => {
        const d = todayStr;
        setCreateDocumentDate(d);
        const code = await getNextStockCheckCode(d);
        setCreateCode(code || '');
        setCreateNote('');
        setCreateRows([]);
        try {
            const res = await getLocations(hasAnyRole('admin') ? {} : { scope: 'mine' });
            let locs = [];
            if (res.success && res.data?.locations) {
                locs = res.data.locations.filter((l) => l.isActive !== false);
            }
            setLocations(locs);
            const preferred =
                currentLocationId &&
                currentLocationId !== 'all' &&
                locs.some((l) => String(l._id) === String(currentLocationId))
                    ? String(currentLocationId)
                    : locs[0]?._id
                      ? String(locs[0]._id)
                      : '';
            setCreateLocationId(preferred);
        } catch (e) {
            console.error(e);
            setLocations([]);
            setCreateLocationId('');
        }
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateCode('');
        setCreateLocationId('');
        setCreateNote('');
        setCreateDocumentDate('');
        setCreateRows([]);
    };

    const onCreateDocumentDateChange = async (e) => {
        const v = e.target.value;
        setCreateDocumentDate(v);
        if (!v) return;
        const code = await getNextStockCheckCode(v);
        if (code) setCreateCode(code);
    };

    const loadProductsForPick = async () => {
        const locId = createLocationId || currentLocationId;
        const res = await getProducts({ page: 1, limit: 200, search: '', locationId: locId || undefined });
        if (res.success && res.data?.products) {
            setProductsForPick(res.data.products);
            setPickSearch('');
            setShowPickProduct(true);
        }
    };

    const addProductToRows = (product) => {
        if (createRows.some((r) => r.product._id === product._id)) {
            toast.error('Sản phẩm đã có trong phiếu');
            return;
        }
        const physical =
            product.physicalStockAtLocation ??
            product.stockAtLocation ??
            product.totalStock ??
            0;
        setCreateRows((prev) => [
            ...prev,
            {
                product,
                quantityBefore: physical,
                /** null = chưa nhập số đếm (lưu nháp sẽ mặc định = tồn sổ; nhập sau trong chi tiết phiếu) */
                quantityCounted: null,
                conditionNote: '',
            },
        ]);
        setShowPickProduct(false);
    };

    const filteredProductsForPick = useMemo(() => {
        const needle = pickSearch.trim().toLowerCase();
        const existsInRows = new Set(createRows.map((r) => String(r.product?._id)));
        const list = (productsForPick || []).filter((p) => !existsInRows.has(String(p?._id)));
        if (!needle) return list;
        return list.filter((p) => {
            const sku = String(p?.sku || '').toLowerCase();
            const name = String(p?.name || '').toLowerCase();
            const bc = String(p?.barcode || '').toLowerCase();
            return sku.includes(needle) || name.includes(needle) || bc.includes(needle);
        });
    }, [productsForPick, pickSearch, createRows]);

    const updateRowConditionNote = (productId, value) => {
        setCreateRows((prev) =>
            prev.map((r) => (r.product._id === productId ? { ...r, conditionNote: value } : r))
        );
    };

    const updateRowCounted = (productId, value) => {
        if (value === '') {
            setCreateRows((prev) =>
                prev.map((r) => (r.product._id === productId ? { ...r, quantityCounted: null } : r))
            );
            return;
        }
        const num = parseInt(value, 10);
        setCreateRows((prev) =>
            prev.map((r) =>
                r.product._id === productId ? { ...r, quantityCounted: isNaN(num) ? null : Math.max(0, num) } : r
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
        if (!createLocationId) {
            toast.error('Vui lòng chọn chi nhánh kiểm kho');
            return;
        }
        if (!createDocumentDate) {
            toast.error('Vui lòng chọn ngày phiếu');
            return;
        }
        if (createDocumentDate > todayStr) {
            toast.error('Ngày phiếu không được sau hôm nay');
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
                locationId: createLocationId,
                note: createNote.trim(),
                documentDate: createDocumentDate,
                items: createRows.map((r) => {
                    const base = { productId: r.product._id };
                    if (r.quantityCounted !== null && r.quantityCounted !== undefined) {
                        base.quantityCounted = r.quantityCounted;
                    }
                    const note = r.conditionNote != null ? String(r.conditionNote).trim() : '';
                    if (note) base.conditionNote = note;
                    return base;
                }),
            });
            toast.success('Đã tạo phiếu kiểm kho (nháp). Mở chi tiết để nhập tồn thực tế sau khi kiểm, rồi xác nhận.');
            closeCreateModal();
            fetchList();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Tạo phiếu thất bại';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const syncDetailDraftsFromStockCheck = (sc) => {
        const draft = {};
        const condDraft = {};
        (sc.items || []).forEach((row) => {
            if (row._id) {
                draft[row._id] = row.quantityCounted ?? 0;
                condDraft[row._id] = row.conditionNote ?? '';
            }
        });
        setDetailCountDraft(draft);
        setDetailConditionDraft(condDraft);
        setDetailNoteDraft(sc.note?.trim() ? sc.note : '');
        setDetailDocumentDateDraft(ymdFromStockCheck(sc));
    };

    const openDetail = async (id) => {
        const res = await getStockCheckById(id);
        if (res.success && res.data?.stockCheck) {
            const sc = res.data.stockCheck;
            setDetailStockCheck(sc);
            syncDetailDraftsFromStockCheck(sc);
            setShowDetailModal(true);
        } else {
            toast.error('Không tải được chi tiết phiếu');
        }
    };

    const handleSaveDetailCounts = async () => {
        if (!detailStockCheck?._id || detailStockCheck.status !== 'draft') return;
        if (!detailDocumentDateDraft) {
            toast.error('Vui lòng chọn ngày phiếu');
            return;
        }
        if (detailDocumentDateDraft > todayStr) {
            toast.error('Ngày phiếu không được sau hôm nay');
            return;
        }
        setSavingDetailCounts(true);
        try {
            const items = (detailStockCheck.items || []).map((it) => {
                const pid = it.product?._id || it.product;
                const lineId = it._id;
                const raw = detailCountDraft[lineId];
                const counted = raw === '' || raw === undefined ? it.quantityCounted ?? 0 : Math.max(0, Number(raw) || 0);
                const cond =
                    detailConditionDraft[lineId] !== undefined
                        ? String(detailConditionDraft[lineId])
                        : (it.conditionNote ?? '');
                return { productId: pid, quantityCounted: counted, conditionNote: cond.trim() };
            });
            const res = await updateStockCheck(detailStockCheck._id, {
                items,
                note: detailNoteDraft.trim(),
                documentDate: detailDocumentDateDraft,
            });
            if (res.success && res.data?.stockCheck) {
                const sc = res.data.stockCheck;
                setDetailStockCheck(sc);
                syncDetailDraftsFromStockCheck(sc);
                toast.success('Đã lưu số đếm và tình trạng');
                fetchList();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Không lưu được');
        } finally {
            setSavingDetailCounts(false);
        }
    };

    const handlePrintStockCheck = () => {
        if (!detailStockCheck) return;
        const sc = detailStockCheck;
        const branchLabel = sc.location ? `${sc.location.code} - ${sc.location.name}` : '—';
        const creator = sc.createdBy
            ? `${sc.createdBy.firstName || ''} ${sc.createdBy.lastName || ''}`.trim() || sc.createdBy.username
            : '—';
        const statusLabel = sc.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp';
        const slipYmd =
            sc.status === 'draft' && detailDocumentDateDraft
                ? detailDocumentDateDraft
                : ymdFromStockCheck(sc);

        const rowsHtml = (sc.items || [])
            .map((it) => {
                const lineId = it._id;
                const raw =
                    lineId !== undefined && detailCountDraft[lineId] !== undefined
                        ? detailCountDraft[lineId]
                        : it.quantityCounted;
                const counted =
                    raw === '' || raw === undefined ? it.quantityCounted : Math.max(0, Number(raw) || 0);
                const cond =
                    lineId !== undefined && detailConditionDraft[lineId] !== undefined
                        ? detailConditionDraft[lineId]
                        : (it.conditionNote ?? '');
                const change = counted - (it.quantityBefore ?? 0);
                const lineVal = change * (it.unitPrice ?? 0);
                const sku = it.product?.sku ?? '—';
                const name = it.product?.name ?? '—';
                return `<tr>
                    <td>${htmlEscape(sku)}</td>
                    <td>${htmlEscape(name)}</td>
                    <td class="wrap">${htmlEscape(cond)}</td>
                    <td class="num">${it.quantityBefore ?? 0}</td>
                    <td class="num">${counted}</td>
                    <td class="num">${change > 0 ? '+' : ''}${change}</td>
                    <td class="num">${formatVND(it.unitPrice)}</td>
                    <td class="num">${formatVND(lineVal)}</td>
                </tr>`;
            })
            .join('');

        const totalVal = (sc.items || []).reduce((s, it) => {
            const lineId = it._id;
            const raw =
                lineId !== undefined && detailCountDraft[lineId] !== undefined
                    ? detailCountDraft[lineId]
                    : it.quantityCounted;
            const counted =
                raw === '' || raw === undefined ? it.quantityCounted : Math.max(0, Number(raw) || 0);
            return s + (counted - (it.quantityBefore ?? 0)) * (it.unitPrice ?? 0);
        }, 0);

        const docTitle = `Phiếu kiểm kho ${sc.code}`;
        const body = `
            <h1>${htmlEscape(docTitle)}</h1>
            <div class="meta">
                <div><strong>Ngày phiếu:</strong> ${htmlEscape(formatYmdVi(slipYmd))}</div>
                <div><strong>Chi nhánh:</strong> ${htmlEscape(branchLabel)}</div>
                <div><strong>Người tạo:</strong> ${htmlEscape(creator)} — ${htmlEscape(formatDate(sc.createdAt))}</div>
                <div><strong>Trạng thái:</strong> ${htmlEscape(statusLabel)}</div>
                ${sc.note?.trim() ? `<div><strong>Ghi chú:</strong> ${htmlEscape(sc.note)}</div>` : ''}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Mã hàng</th>
                        <th>Tên sản phẩm</th>
                        <th>Tình trạng</th>
                        <th class="num">Tồn hệ thống</th>
                        <th class="num">Tồn thực tế</th>
                        <th class="num">Chênh lệch</th>
                        <th class="num">Đơn giá</th>
                        <th class="num">Giá trị chênh lệch</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <p class="total">Tổng giá trị chênh lệch (ước tính): ${htmlEscape(formatVND(totalVal))}</p>
        `;

        const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>${htmlEscape(docTitle)}</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 16px; color: #111; font-size: 12px; }
                h1 { font-size: 18px; margin: 0 0 12px; }
                .meta { margin-bottom: 14px; line-height: 1.55; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
                th { background: #dbeafe; font-weight: 600; }
                td.wrap { white-space: pre-wrap; word-break: break-word; max-width: 200px; }
                .num { text-align: right; font-variant-numeric: tabular-nums; }
                .total { margin-top: 14px; text-align: right; font-weight: 700; font-size: 13px; }
                @media print { body { padding: 8px; } }
            </style></head><body>${body}</body></html>`;

        const win = window.open('', '_blank');
        if (!win) {
            toast.error('Trình duyệt chặn cửa sổ in. Cho phép popup và thử lại.');
            return;
        }
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => {
            try {
                win.print();
            } finally {
                win.close();
            }
        }, 300);
    };

    const handleReopenDetail = () => {
        if (!detailStockCheck?._id || detailStockCheck.status !== 'confirmed') return;
        setConfirmModal({
            isOpen: true,
            title: 'Hủy xác nhận phiếu kiểm kho',
            message: `Tồn kho tại chi nhánh sẽ khôi phục về số sổ trước khi xác nhận phiếu ${detailStockCheck.code}. Phiếu chuyển về nháp để chỉnh sửa hoặc xóa.`,
            onConfirm: async () => {
                setReopenSubmitting(true);
                try {
                    const res = await reopenStockCheck(detailStockCheck._id);
                    if (res.success && res.data?.stockCheck) {
                        const sc = res.data.stockCheck;
                        setDetailStockCheck(sc);
                        syncDetailDraftsFromStockCheck(sc);
                        toast.success(res.message || 'Đã hủy xác nhận');
                        fetchList();
                    }
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Không hủy xác nhận được');
                } finally {
                    setReopenSubmitting(false);
                }
            },
        });
    };

    const handleDeleteDetail = () => {
        if (!detailStockCheck?._id) return;
        const isConfirmed = detailStockCheck.status === 'confirmed';
        setConfirmModal({
            isOpen: true,
            title: 'Xóa phiếu kiểm kho',
            message: isConfirmed
                ? `Phiếu đã xác nhận: hệ thống sẽ khôi phục tồn kho về số sổ trước kiểm, rồi xóa vĩnh viễn phiếu ${detailStockCheck.code}.`
                : `Xóa vĩnh viễn phiếu ${detailStockCheck.code}? Thao tác này không hoàn tác.`,
            onConfirm: async () => {
                try {
                    await deleteStockCheck(detailStockCheck._id);
                    toast.success('Đã xóa phiếu kiểm kho');
                    setShowDetailModal(false);
                    setDetailStockCheck(null);
                    setDetailNoteDraft('');
                    setDetailDocumentDateDraft('');
                    fetchList();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Không xóa được phiếu');
                }
            },
        });
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
                    setDetailNoteDraft('');
                    setDetailDocumentDateDraft('');
                    fetchList();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xác nhận thất bại');
                }
            },
        });
    };

    const optionCategories = useMemo(
        () => (productOptions.category || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)),
        [productOptions.category]
    );
    const optionBrands = useMemo(
        () => (productOptions.brand || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)),
        [productOptions.brand]
    );

    const filteredCategories = useMemo(
        () =>
            optionCategories.filter((c) =>
                categorySearch ? String(c).toLowerCase().includes(categorySearch.toLowerCase()) : true
            ),
        [optionCategories, categorySearch]
    );

    const filteredBrands = useMemo(
        () =>
            optionBrands.filter((b) =>
                brandSearch ? String(b).toLowerCase().includes(brandSearch.toLowerCase()) : true
            ),
        [optionBrands, brandSearch]
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="label py-0 flex flex-col gap-0.5 items-start">
                            <span className="label-text text-sm">Từ ngày</span>
                            <span className="text-[11px] text-base-content/50 font-normal">Theo ngày phiếu</span>
                        </label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.fromDate}
                            onChange={(e) => {
                                let value = e.target.value;
                                // Không cho chọn ngày lớn hơn hôm nay trên UI
                                if (value && value > todayStr) value = todayStr;
                                setFilters((f) => ({
                                    ...f,
                                    fromDate: value,
                                    // Nếu xóa "Từ ngày" thì cũng xóa luôn "Đến ngày"
                                    toDate: value ? f.toDate : '',
                                }));
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            max={todayStr}
                        />
                    </div>
                    <div>
                        <label className="label py-0"><span className="label-text text-sm">Đến ngày</span></label>
                        <input
                            type="date"
                            className="input input-bordered input-sm w-full"
                            value={filters.toDate}
                            onChange={(e) => {
                                const value = e.target.value;
                                setFilters((f) => ({ ...f, toDate: value }));
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            min={filters.fromDate || undefined}
                            disabled={!filters.fromDate}
                        />
                    </div>
                    <div className="form-control relative w-40">
                        <label className="label py-0">
                            <span className="label-text text-sm">Loại hàng</span>
                        </label>
                        <div
                            className="relative"
                            onClick={() => setCategoryDropdownOpen((o) => !o)}
                        >
                            <input
                                readOnly
                                className="input input-bordered input-sm w-full cursor-pointer"
                                value={filters.category || 'Tất cả'}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-base-content/70">
                                ▼
                            </span>
                        </div>
                        {categoryDropdownOpen && (
                            <div className="absolute z-30 mt-1 bg-base-100 rounded-box shadow-lg border border-base-300">
                                <div className="p-2 border-b border-base-200 bg-base-100">
                                    <input
                                        type="text"
                                        className="input input-sm w-full outline-none border-primary/25 focus:border-primary/50"
                                        placeholder="Tìm loại hàng..."
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <ul className="menu menu-sm max-h-56 w-full overflow-y-auto bg-base-100">
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((f) => ({ ...f, category: '' }));
                                                setPagination((p) => ({ ...p, page: 1 }));
                                                setCategoryDropdownOpen(false);
                                                setCategorySearch('');
                                            }}
                                            className="text-base-content/70"
                                        >
                                            Tất cả
                                        </button>
                                    </li>
                                    {filteredCategories.map((c) => (
                                        <li key={c}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFilters((f) => ({ ...f, category: c }));
                                                    setPagination((p) => ({ ...p, page: 1 }));
                                                    setCategoryDropdownOpen(false);
                                                    setCategorySearch('');
                                                }}
                                                className={
                                                    filters.category === c
                                                        ? 'font-medium bg-base-200'
                                                        : undefined
                                                }
                                            >
                                                {c}
                                            </button>
                                        </li>
                                    ))}
                                    {filteredCategories.length === 0 && (
                                        <li className="px-4 py-2 text-xs text-base-content/50">
                                            Không tìm thấy kết quả
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="form-control relative w-40">
                        <label className="label py-0">
                            <span className="label-text text-sm">Thương hiệu</span>
                        </label>
                        <div
                            className="relative"
                            onClick={() => setBrandDropdownOpen((o) => !o)}
                        >
                            <input
                                readOnly
                                className="input input-bordered input-sm w-full cursor-pointer"
                                value={filters.brand || 'Tất cả'}
                            />
                            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-base-content/70">
                                ▼
                            </span>
                        </div>
                        {brandDropdownOpen && (
                            <div className="absolute z-30 mt-1 bg-base-100 rounded-box shadow-lg border border-base-300">
                                <div className="p-2 border-b border-base-200 bg-base-100">
                                    <input
                                        type="text"
                                        className="input input-sm w-full outline-none border-primary/25 focus:border-primary/50"
                                        placeholder="Tìm thương hiệu..."
                                        value={brandSearch}
                                        onChange={(e) => setBrandSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <ul className="menu menu-sm max-h-56 w-full overflow-y-auto bg-base-100">
                                    <li>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilters((f) => ({ ...f, brand: '' }));
                                                setPagination((p) => ({ ...p, page: 1 }));
                                                setBrandDropdownOpen(false);
                                                setBrandSearch('');
                                            }}
                                            className="text-base-content/70"
                                        >
                                            Tất cả
                                        </button>
                                    </li>
                                    {filteredBrands.map((b) => (
                                        <li key={b}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFilters((f) => ({ ...f, brand: b }));
                                                    setPagination((p) => ({ ...p, page: 1 }));
                                                    setBrandDropdownOpen(false);
                                                    setBrandSearch('');
                                                }}
                                                className={
                                                    filters.brand === b
                                                        ? 'font-medium bg-base-200'
                                                        : undefined
                                                }
                                            >
                                                {b}
                                            </button>
                                        </li>
                                    ))}
                                    {filteredBrands.length === 0 && (
                                        <li className="px-4 py-2 text-xs text-base-content/50">
                                            Không tìm thấy kết quả
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
                        Xóa bộ lọc
                    </button>
                </div>
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
                    <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                        <table className="table">
                            <thead className='bg-blue-100 sticky top-0 z-20'>
                                <tr>
                                    <th className="font-medium text-neutral text-xs">Mã phiếu</th>
                                    <th className="font-medium text-neutral text-xs">Chi nhánh</th>
                                    <th className="font-medium text-neutral text-xs">Người tạo</th>
                                    <th className="font-medium text-neutral text-xs">Ngày phiếu</th>
                                    <th className="font-medium text-neutral text-xs">Trạng thái</th>
                                    <th className="font-medium text-neutral text-xs"></th>
                                </tr>
                            </thead>
                            <tbody className='text-xs'>
                                {list.map((sc) => (
                                    <tr key={sc._id} className="hover:bg-base-200/60 transition-colors font-light">
                                        <td className="font-medium">{sc.code}</td>
                                        <td>
                                            {sc.location ? `${sc.location.code} - ${sc.location.name}` : '—'}
                                        </td>
                                        <td>
                                            {sc.createdBy
                                                ? `${sc.createdBy.firstName || ''} ${sc.createdBy.lastName || ''}`.trim() || sc.createdBy.username
                                                : '—'}
                                        </td>
                                        <td>{formatYmdVi(ymdFromStockCheck(sc))}</td>
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
                    <div className="modal-box w-[min(1200px,calc(100vw-1.5rem))] max-w-none max-h-[90vh] overflow-y-auto">
                        <h3 className="font-bold text-lg mb-2">Tạo phiếu kiểm kho</h3>
                        <p className="text-sm text-base-content/60 mb-4">
                            Chọn ngày trên phiếu (có thể là ngày cũ); mã KK-… tự theo ngày đó. Có thể lưu nháp chỉ với danh sách
                            hàng; số đếm thực tế nhập sau trong chi tiết phiếu.
                        </p>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            Ngày phiếu <span className="text-error">*</span>
                                        </span>
                                    </label>
                                    <input
                                        type="date"
                                        className="input input-bordered w-full"
                                        max={todayStr}
                                        value={createDocumentDate}
                                        onChange={onCreateDocumentDateChange}
                                        required
                                    />
                                    <p className="text-xs text-base-content/60 mt-1">
                                        Mặc định hôm nay — đổi để nhập chứng từ ngày trước.
                                    </p>
                                </div>
                                <div>
                                    <label className="label"><span className="label-text font-semibold">Mã phiếu</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createCode}
                                        onChange={(e) => setCreateCode(e.target.value)}
                                        placeholder="KK-YYYYMMDD-001"
                                    />
                                    <p className="text-xs text-base-content/60 mt-1">Gợi ý theo ngày phiếu; có thể sửa tay.</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="label"><span className="label-text font-semibold">Chi nhánh <span className="text-error">*</span></span></label>
                                    <select
                                        className="select select-bordered w-full"
                                        value={createLocationId}
                                        onChange={(e) => setCreateLocationId(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Chọn chi nhánh --</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>{loc.code} - {loc.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
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
                                        <thead className='bg-blue-100 sticky top-0 z-20'>
                                            <tr>
                                                <th>Mã hàng</th>
                                                <th>Tên sản phẩm</th>
                                                <th className="min-w-[140px] max-w-[240px]">Tình trạng</th>
                                                <th className="text-right">Tồn hệ thống (sổ sách)</th>
                                                <th className="text-right">Tồn thực tế (đếm)</th>
                                                <th className="text-right">Chênh lệch</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {createRows.map((r) => {
                                                const change =
                                                    r.quantityCounted === null || r.quantityCounted === undefined
                                                        ? null
                                                        : r.quantityCounted - r.quantityBefore;
                                                return (
                                                    <tr key={r.product._id}>
                                                        <td className="font-medium">{r.product.sku}</td>
                                                        <td>{r.product.name}</td>
                                                        <td>
                                                            <textarea
                                                                className="textarea textarea-bordered textarea-sm w-full min-h-9 py-1.5 text-sm leading-snug max-w-[260px]"
                                                                rows={2}
                                                                placeholder="VD: vỏ, date, ẩm…"
                                                                maxLength={1000}
                                                                value={r.conditionNote ?? ''}
                                                                onChange={(e) => updateRowConditionNote(r.product._id, e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="text-right">{r.quantityBefore}</td>
                                                        <td className="text-right">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="input input-bordered input-sm w-28 text-right"
                                                                placeholder="Sau khi kiểm"
                                                                value={r.quantityCounted === null || r.quantityCounted === undefined ? '' : r.quantityCounted}
                                                                onChange={(e) => updateRowCounted(r.product._id, e.target.value)}
                                                            />
                                                        </td>
                                                        <td
                                                            className={`text-right font-medium ${
                                                                change !== null && change !== 0
                                                                    ? change > 0
                                                                        ? 'text-success'
                                                                        : 'text-error'
                                                                    : ''
                                                            }`}
                                                        >
                                                            {change === null ? '—' : `${change > 0 ? '+' : ''}${change}`}
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
                                        'Lưu phiếu nháp'
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
                    <div className="modal-box w-[min(1200px,calc(100vw-1.5rem))] max-w-none max-h-[88vh] p-0 overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-base-200 bg-base-100 sticky top-0 z-10">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg">Chọn sản phẩm</h3>
                                    <p className="text-sm text-base-content/60 mt-1">
                                        Tìm theo <span className="font-medium">mã hàng (SKU)</span>, <span className="font-medium">mã vạch</span> hoặc <span className="font-medium">tên sản phẩm</span>.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-circle"
                                    onClick={() => setShowPickProduct(false)}
                                    aria-label="Đóng chọn sản phẩm"
                                >
                                    <X className="w-5 h-5" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="mt-4">
                                <label className="label py-0">
                                    <span className="label-text text-sm font-medium">Tìm sản phẩm</span>
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" aria-hidden="true" />
                                    <input
                                        type="text"
                                        className="input input-bordered w-full pl-9"
                                        placeholder="Nhập SKU, barcode hoặc tên…"
                                        value={pickSearch}
                                        onChange={(e) => setPickSearch(e.target.value)}
                                        autoComplete="off"
                                        spellCheck={false}
                                    />
                                </div>
                                <p className="text-xs text-base-content/55 mt-2">
                                    Hiển thị <span className="font-medium">{filteredProductsForPick.length}</span> sản phẩm
                                </p>
                            </div>
                        </div>

                        <div className="px-4 py-3 overflow-y-auto max-h-[calc(88vh-220px)] bg-base-100 overscroll-contain">
                            {filteredProductsForPick.length === 0 ? (
                                <div className="p-6 text-sm text-base-content/60 text-center">
                                    Không có sản phẩm phù hợp.
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {filteredProductsForPick.map((p) => {
                                        const stock = p.physicalStockAtLocation ?? p.stockAtLocation ?? p.totalStock ?? 0;
                                        const img = p.images?.[0] || p.image || '';
                                        return (
                                            <li key={p._id}>
                                                <button
                                                    type="button"
                                                    onClick={() => addProductToRows(p)}
                                                    className="w-full text-left rounded-xl border border-base-200 bg-base-100 hover:bg-base-200/50 hover:border-base-300 transition-colors px-3 py-2.5 flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                >
                                                    <span className="flex items-center gap-3 min-w-0">
                                                        <span className="w-12 h-12 rounded-lg bg-base-200 shrink-0 overflow-hidden flex items-center justify-center">
                                                            {img ? (
                                                                <img
                                                                    src={img}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-base-content/40">N/A</span>
                                                            )}
                                                        </span>
                                                        <span className="min-w-0">
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="block text-xs text-base-content/60 font-mono truncate mt-0.5">
                                                                {p.sku ? `SKU ${p.sku}` : 'SKU —'}
                                                                {p.barcode ? ` · BC ${p.barcode}` : ''}
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-right">
                                                        <span className="text-xs text-base-content/55 block">Tồn sổ</span>
                                                        <span className="badge badge-primary badge-sm font-mono tabular-nums">
                                                            {stock}
                                                        </span>
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
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
                    <div className="modal-box w-[min(1440px,calc(100vw-1.5rem))] max-w-none max-h-[92vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-4 gap-2">
                            <div>
                                <h3 className="font-bold text-lg">Phiếu kiểm kho: {detailStockCheck.code}</h3>
                                <p className="text-sm text-base-content/60 mt-1">
                                    Chi nhánh: {detailStockCheck.location ? `${detailStockCheck.location.code} - ${detailStockCheck.location.name}` : '—'}
                                </p>
                                <p className="text-sm text-base-content/60 mt-1">
                                    Người tạo: {detailStockCheck.createdBy ? `${detailStockCheck.createdBy.firstName || ''} ${detailStockCheck.createdBy.lastName || ''}`.trim() || detailStockCheck.createdBy.username : '—'} — {formatDate(detailStockCheck.createdAt)}
                                </p>
                                <span className={`badge badge-sm mt-2 ${detailStockCheck.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                    {detailStockCheck.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                </span>
                            </div>
                            <div className="flex items-center flex-wrap justify-end gap-1 shrink-0">
                                {detailStockCheck.status === 'draft' && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-primary btn-outline gap-1"
                                            disabled={savingDetailCounts}
                                            onClick={handleSaveDetailCounts}
                                            title="Lưu ghi chú, số đếm và tình trạng từng dòng"
                                        >
                                            {savingDetailCounts ? (
                                                <span className="loading loading-spinner loading-xs" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Lưu thay đổi
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline btn-error gap-1"
                                            onClick={handleDeleteDetail}
                                            title="Xóa phiếu nháp"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Xóa phiếu
                                        </button>
                                    </>
                                )}
                                {detailStockCheck.status === 'confirmed' && (
                                    <>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline btn-warning gap-1"
                                            disabled={reopenSubmitting}
                                            onClick={handleReopenDetail}
                                            title="Khôi phục tồn kho về số sổ trước khi xác nhận; phiếu chuyển về nháp để sửa"
                                        >
                                            {reopenSubmitting ? (
                                                <span className="loading loading-spinner loading-xs" />
                                            ) : (
                                                <RotateCcw className="w-4 h-4" />
                                            )}
                                            Hủy xác nhận
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline btn-error gap-1"
                                            disabled={reopenSubmitting}
                                            onClick={handleDeleteDetail}
                                            title="Hoàn tác tồn kho rồi xóa vĩnh viễn phiếu"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Xóa phiếu
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline gap-1"
                                    onClick={handlePrintStockCheck}
                                    title="In phiếu kiểm kho"
                                >
                                    <Printer className="w-4 h-4" />
                                    In phiếu
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm btn-circle"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setDetailStockCheck(null);
                                        setDetailNoteDraft('');
                                        setDetailDocumentDateDraft('');
                                    }}
                                    aria-label="Đóng"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        {detailStockCheck.status === 'confirmed' && (
                            <p className="text-sm text-base-content/60 mb-3 leading-relaxed">
                                <strong>Hủy xác nhận</strong> đưa phiếu về nháp và đặt lại tồn kho theo cột Tồn hệ thống (sổ) trên phiếu (số trước lần xác nhận).{' '}
                                <strong>Xóa phiếu</strong> khi đã xác nhận cũng hoàn tác tồn tương tự rồi xóa bản ghi.
                            </p>
                        )}
                        <div className="mb-4">
                            <label className="label py-0">
                                <span className="label-text font-semibold">Ngày phiếu</span>
                            </label>
                            {detailStockCheck.status === 'draft' ? (
                                <input
                                    type="date"
                                    className="input input-bordered input-sm w-full max-w-xs"
                                    max={todayStr}
                                    value={detailDocumentDateDraft}
                                    onChange={(e) => setDetailDocumentDateDraft(e.target.value)}
                                />
                            ) : (
                                <p className="text-sm">{formatYmdVi(ymdFromStockCheck(detailStockCheck))}</p>
                            )}
                            <p className="text-xs text-base-content/50 mt-1">
                                Ngày ghi trên chứng từ (khác với thời điểm nhập hệ thống bên trên).
                            </p>
                        </div>
                        <div className="mb-4">
                            <label className="label py-0">
                                <span className="label-text font-semibold">Ghi chú phiếu</span>
                            </label>
                            {detailStockCheck.status === 'draft' ? (
                                <textarea
                                    className="textarea textarea-bordered w-full min-h-16 text-sm"
                                    placeholder="Ghi chú chung cho phiếu (tùy chọn)…"
                                    value={detailNoteDraft}
                                    onChange={(e) => setDetailNoteDraft(e.target.value)}
                                />
                            ) : (
                                <p className="text-sm text-base-content/90 whitespace-pre-wrap">
                                    {detailStockCheck.note?.trim() ? detailStockCheck.note : '—'}
                                </p>
                            )}
                        </div>
                        <div className="overflow-x-auto border border-base-300 rounded-lg">
                            <table className="table table-sm">
                                <thead className='bg-blue-100 sticky top-0 z-20'>
                                    <tr>
                                        <th>Mã hàng</th>
                                        <th>Tên sản phẩm</th>
                                        <th className="min-w-[140px] max-w-[240px]">Tình trạng</th>
                                        <th className="text-right">Tồn hệ thống (sổ)</th>
                                        <th className="text-right">Tồn thực tế (đếm)</th>
                                        <th className="text-right">Chênh lệch</th>
                                        <th className="text-right">Đơn giá</th>
                                        <th className="text-right">Giá trị chênh lệch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detailStockCheck.items?.map((it) => {
                                        const lineId = it._id;
                                        const isDraft = detailStockCheck.status === 'draft';
                                        const draftVal =
                                            lineId !== undefined && detailCountDraft[lineId] !== undefined
                                                ? detailCountDraft[lineId]
                                                : it.quantityCounted;
                                        const countedNum =
                                            draftVal === '' || draftVal === undefined ? it.quantityCounted : Math.max(0, Number(draftVal) || 0);
                                        const displayChange = countedNum - (it.quantityBefore ?? 0);
                                        return (
                                            <tr key={lineId || it.product?._id || it.product}>
                                                <td className="font-medium">{it.product?.sku ?? '—'}</td>
                                                <td>{it.product?.name ?? '—'}</td>
                                                <td className="align-top min-w-[140px] max-w-[260px]">
                                                    {isDraft && lineId ? (
                                                        <textarea
                                                            className="textarea textarea-bordered textarea-sm w-full min-h-10 py-1.5 text-sm leading-snug"
                                                            rows={2}
                                                            placeholder="Ghi chú tình trạng hàng…"
                                                            maxLength={1000}
                                                            value={
                                                                detailConditionDraft[lineId] !== undefined
                                                                    ? detailConditionDraft[lineId]
                                                                    : (it.conditionNote ?? '')
                                                            }
                                                            onChange={(e) =>
                                                                setDetailConditionDraft((d) => ({
                                                                    ...d,
                                                                    [lineId]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    ) : (
                                                        <span className="text-sm text-base-content/85 whitespace-pre-wrap wrap-break-word">
                                                            {it.conditionNote?.trim() ? it.conditionNote : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-right">{it.quantityBefore}</td>
                                                <td className="text-right">
                                                    {isDraft && lineId ? (
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="input input-bordered input-sm w-28 text-right"
                                                            value={detailCountDraft[lineId] ?? ''}
                                                            onChange={(e) =>
                                                                setDetailCountDraft((d) => ({
                                                                    ...d,
                                                                    [lineId]: e.target.value === '' ? '' : e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    ) : (
                                                        it.quantityCounted
                                                    )}
                                                </td>
                                                <td
                                                    className={`text-right font-medium ${
                                                        displayChange !== 0
                                                            ? displayChange > 0
                                                                ? 'text-success'
                                                                : 'text-error'
                                                            : ''
                                                    }`}
                                                >
                                                    {displayChange > 0 ? '+' : ''}
                                                    {displayChange}
                                                </td>
                                                <td className="text-right">{formatVND(it.unitPrice)}</td>
                                                <td className="text-right">
                                                    {formatVND((countedNum - (it.quantityBefore ?? 0)) * (it.unitPrice ?? 0))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-4">
                            <p className="font-semibold">
                                Tổng giá trị chênh lệch (ước tính):{' '}
                                {formatVND(
                                    (detailStockCheck.items || []).reduce((s, it) => {
                                        const lineId = it._id;
                                        const raw =
                                            lineId !== undefined && detailCountDraft[lineId] !== undefined
                                                ? detailCountDraft[lineId]
                                                : it.quantityCounted;
                                        const counted =
                                            raw === '' || raw === undefined ? it.quantityCounted : Math.max(0, Number(raw) || 0);
                                        return s + (counted - (it.quantityBefore ?? 0)) * (it.unitPrice ?? 0);
                                    }, 0)
                                )}
                            </p>
                        </div>
                        {detailStockCheck.status === 'draft' && (
                            <div className="modal-action mt-4 flex flex-wrap gap-2 justify-end">
                                <button
                                    type="button"
                                    className="btn btn-outline btn-primary gap-2"
                                    disabled={savingDetailCounts}
                                    onClick={handleSaveDetailCounts}
                                >
                                    {savingDetailCounts ? (
                                        <span className="loading loading-spinner loading-sm" />
                                    ) : null}
                                    Lưu số đếm và tình trạng
                                </button>
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
                        <button
                            type="button"
                            onClick={() => {
                                setShowDetailModal(false);
                                setDetailStockCheck(null);
                                setDetailNoteDraft('');
                                setDetailDocumentDateDraft('');
                            }}
                        >
                            Đóng
                        </button>
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
