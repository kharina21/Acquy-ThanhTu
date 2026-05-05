import React, { useEffect, useState, useRef } from 'react';
import { Package, Search, CheckCircle, X, Plus, Pencil, Trash2, RotateCcw, ChevronDown, ChevronUp, ChevronRight, Printer } from 'lucide-react';
import {
    getNextStockInCode,
    getStockIns,
    getStockInById,
    createStockIn,
    updateStockIn,
    deleteStockIn,
    confirmStockIn,
} from '@/services/stockInService';
import { getNextStockReturnCode, createStockReturn } from '@/services/stockReturnService';
import { getProducts } from '@/services/productService';
import { createSupplier, updateSupplier, getNextSupplierCode, getSuppliers } from '@/services/supplierService';
import { useBranchStore } from '@/stores/useBranchStore';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import ModalPortal from '@/components/common/ModalPortal';
import SupplierSelect from '@/components/common/SupplierSelect';
import SupplierModal from './SupplierModal';
import { toast } from 'sonner';
import {
    buildLabelCellInnerHtml,
    buildProductBarcodePrintDocumentHtml,
    buildSheetsFromCellInnerHtmls,
    createBarcodeDataUrl,
    normalizeBarcodeValueForCode128,
} from '@/utils/productBarcodePrint';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const htmlEscape = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** HTML in tem nhập hàng — cùng layout/CSS với in tem ở chi tiết sản phẩm (70×22mm, 2 ô). */
const buildStockInPrintHtml = ({ product, quantity }) => {
    const name = product?.name || '';
    const sku = product?.sku || '';
    const raw = (product?.barcode || product?.sku || '').toString().trim();
    if (!raw) {
        throw new Error('MISSING_CODE');
    }
    const barcodeValue = normalizeBarcodeValueForCode128(raw);
    if (!barcodeValue) {
        throw new Error('INVALID_CODE');
    }
    const barcodeDataUrl = createBarcodeDataUrl(barcodeValue);
    const priceStr = product?.price != null && !Number.isNaN(Number(product.price)) ? formatVND(product.price) : '';

    const qty = Math.max(1, Math.min(500, Number(quantity) || 1));
    const cellInner = buildLabelCellInnerHtml({
        name,
        capacity: product?.capacity,
        sku,
        barcodeValue,
        barcodeDataUrl,
        priceStr,
    });
    const cellInners = Array.from({ length: qty }, () => cellInner);
    const sheetsHtml = buildSheetsFromCellInnerHtmls(cellInners);
    return buildProductBarcodePrintDocumentHtml(`Tem nhập hàng - ${sku}`, sheetsHtml);
};

const ImportGoodsPage = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', status: '', code: '', supplierId: '' });
    const [debouncedCode, setDebouncedCode] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createCode, setCreateCode] = useState('');
    const [createLocationId, setCreateLocationId] = useState('');
    const [createSupplierId, setCreateSupplierId] = useState('');
    const [createNote, setCreateNote] = useState('');
    const [createRows, setCreateRows] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [productSearchResults, setProductSearchResults] = useState([]);
    const [productSearchLoading, setProductSearchLoading] = useState(false);
    const [productSearchOpen, setProductSearchOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const productSearchRef = useRef(null);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedDetail, setExpandedDetail] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [supplierRefreshKey, setSupplierRefreshKey] = useState(0);
    const [supplierSubmitting, setSupplierSubmitting] = useState(false);
    const [editingStockInId, setEditingStockInId] = useState(null);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnCode, setReturnCode] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [returnRows, setReturnRows] = useState([]);
    const [returnSubmitting, setReturnSubmitting] = useState(false);

    const { currentLocationId, locations, loaded: branchLocationsLoaded, fetchLocations } = useBranchStore();

    const printFrameRef = useRef(null);
    const [printSrcDoc, setPrintSrcDoc] = useState('');

    const stampPrintHtml = (html) => {
        const tag = `<!--print:${Date.now()}-->`;
        if (typeof html === 'string' && html.includes('</body>')) return html.replace('</body>', `${tag}</body>`);
        return `${html || ''}${tag}`;
    };

    const fetchList = async (overridePage) => {
        setLoading(true);
        const page = overridePage !== undefined ? overridePage : pagination.page;
        const params = { page, limit: pagination.limit };
        if (currentLocationId) params.locationId = currentLocationId;
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;
        if (filters.status) params.status = filters.status;
        if (debouncedCode?.trim()) params.code = debouncedCode.trim();
        if (filters.supplierId) params.supplierId = filters.supplierId;

        const res = await getStockIns(params);
        if (res.success && res.data) {
            setList(res.data.stockIns || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!branchLocationsLoaded) {
            // AdminLayout thường đã tải sẵn, nhưng đảm bảo khi vào trực tiếp route kho.
            fetchLocations({ scope: 'mine' });
        }
    }, [branchLocationsLoaded, fetchLocations]);

    useEffect(() => {
        const loadSuppliers = async () => {
            const res = await getSuppliers();
            if (res.success && res.data?.suppliers) {
                setSuppliers((res.data.suppliers || []).filter((s) => s.isActive !== false));
            }
        };
        loadSuppliers();
    }, [supplierRefreshKey]);

    const handleCreateSupplier = async () => {
        setEditingSupplier(null);
        try {
            const code = await getNextSupplierCode();
            setEditingSupplier(code ? { _nextCode: code } : {});
        } catch {
            setEditingSupplier({});
        }
        setShowSupplierModal(true);
    };

    const handleEditSupplier = (supplier) => {
        setEditingSupplier(supplier);
        setShowSupplierModal(true);
    };

    const handleSaveSupplier = async (formData) => {
        setSupplierSubmitting(true);
        try {
            if (editingSupplier?._id) {
                const res = await updateSupplier(editingSupplier._id, formData);
                if (res.success) {
                    toast.success('Cập nhật nhà cung cấp thành công');
                    setSupplierRefreshKey((k) => k + 1);
                    setShowSupplierModal(false);
                    setCreateSupplierId(res.data.supplier._id);
                }
            } else {
                const payload = { ...formData };
                if (editingSupplier?._nextCode) payload.code = editingSupplier._nextCode;
                const res = await createSupplier(payload);
                if (res.success) {
                    toast.success('Tạo nhà cung cấp thành công');
                    setSupplierRefreshKey((k) => k + 1);
                    setShowSupplierModal(false);
                    setCreateSupplierId(res.data.supplier._id);
                }
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Lỗi khi lưu nhà cung cấp');
        } finally {
            setSupplierSubmitting(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedCode(filters.code), 400);
        return () => clearTimeout(t);
    }, [filters.code]);

    useEffect(() => {
        setPagination((p) => ({ ...p, page: 1 }));
    }, [filters.fromDate, filters.toDate, filters.status, debouncedCode, filters.supplierId, currentLocationId]);

    useEffect(() => {
        fetchList();
    }, [pagination.page, filters.fromDate, filters.toDate, filters.status, debouncedCode, filters.supplierId, currentLocationId]);

    useEffect(() => {
        if (!productSearch.trim()) {
            setProductSearchResults([]);
            setProductSearchOpen(false);
            return;
        }
        const timer = setTimeout(() => searchProducts(productSearch), 300);
        return () => clearTimeout(timer);
    }, [productSearch, createLocationId]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
                setProductSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openCreateModal = async () => {
        setEditingStockInId(null);
        const code = await getNextStockInCode();
        setCreateCode(code || '');
        setCreateLocationId(currentLocationId || '');
        setCreateSupplierId('');
        setCreateNote('');
        setCreateRows([]);
        setShowCreateModal(true);
    };

    const openEditModal = (stockIn) => {
        if (stockIn.status !== 'draft') return;
        setEditingStockInId(stockIn._id);
        setCreateCode(stockIn.code || '');
        setCreateLocationId(stockIn.location?._id || stockIn.location || '');
        setCreateSupplierId(stockIn.supplier?._id || stockIn.supplier || '');
        setCreateNote(stockIn.note || '');
        setCreateRows(
            (stockIn.items || []).map((it) => ({
                product: it.product || { _id: it.product },
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
            })),
        );
        setProductSearch('');
        setProductSearchResults([]);
        setProductSearchOpen(false);
        setShowCreateModal(true);
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setEditingStockInId(null);
        setCreateCode('');
        setCreateLocationId('');
        setCreateSupplierId('');
        setCreateNote('');
        setCreateRows([]);
        setProductSearch('');
        setProductSearchResults([]);
        setProductSearchOpen(false);
    };

    const searchProducts = async (term) => {
        if (!term?.trim()) {
            setProductSearchResults([]);
            setProductSearchOpen(false);
            return;
        }
        setProductSearchLoading(true);
        setProductSearchOpen(true);
        try {
            const locId = createLocationId || currentLocationId;
            const res = await getProducts({
                page: 1,
                limit: 15,
                search: term.trim(),
                locationId: locId || undefined,
            });
            if (res.success && res.data?.products) {
                setProductSearchResults(res.data.products);
            } else {
                setProductSearchResults([]);
            }
        } catch {
            setProductSearchResults([]);
        } finally {
            setProductSearchLoading(false);
        }
    };

    const addProductToRows = (product) => {
        if (createRows.some((r) => r.product._id === product._id)) {
            toast.error('Sản phẩm đã có trong phiếu');
            return;
        }
        setCreateRows((prev) => [
            ...prev,
            { product, quantity: 1, unitPrice: product.costPrice || product.price || 0 },
        ]);
        setProductSearch('');
        setProductSearchResults([]);
        setProductSearchOpen(false);
    };

    const updateRow = (productId, field, value) => {
        setCreateRows((prev) =>
            prev.map((r) => {
                if (r.product._id !== productId) return r;
                if (field === 'quantity') {
                    const nextQty = Math.max(1, parseInt(value, 10) || 0);
                    return { ...r, quantity: nextQty };
                }
                const updated = { ...r, [field]: parseFloat(value) || 0 };
                return updated;
            }),
        );
    };

    const removeRow = (productId) => {
        setCreateRows((prev) => prev.filter((r) => r.product._id !== productId));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        if (!createCode.trim()) {
            toast.error('Vui lòng nhập mã phiếu nhập');
            return;
        }
        if (!createLocationId) {
            toast.error('Vui lòng chọn chi nhánh nhập hàng');
            return;
        }
        if (createRows.length === 0) {
            toast.error('Vui lòng thêm ít nhất một sản phẩm');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                supplier: createSupplierId || undefined,
                location: createLocationId,
                note: createNote.trim(),
                items: createRows.map((r) => ({
                    product: r.product?._id || r.product,
                    quantity: r.quantity,
                    unitPrice: r.unitPrice,
                })),
            };
            if (editingStockInId) {
                const res = await updateStockIn(editingStockInId, payload);
                if (res.success) {
                    toast.success('Cập nhật phiếu nhập hàng thành công');
                    closeCreateModal();
                    setExpandedId(null);
                    setExpandedDetail(null);
                    fetchList();
                }
            } else {
                const res = await createStockIn({ ...payload, code: createCode.trim() });
                if (res.success) {
                    toast.success('Tạo phiếu nhập hàng thành công');
                    closeCreateModal();
                    fetchList();
                }
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || (editingStockInId ? 'Cập nhật thất bại' : 'Tạo phiếu thất bại'));
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrintStockInTable = () => {
        if (!expandedDetail) return;
        const si = expandedDetail;
        const supplierLabel = si.supplier ? `${si.supplier.code} - ${si.supplier.name}` : '—';
        const branchLabel = si.location ? `${si.location.code} - ${si.location.name}` : '—';
        const creator = si.createdBy
            ? `${si.createdBy.firstName || ''} ${si.createdBy.lastName || ''}`.trim() || si.createdBy.username
            : '—';
        const statusLabel = si.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp';

        const rowsHtml = (si.items || [])
            .map((it) => {
                const sku = it.product?.sku ?? '—';
                const name = it.product?.name ?? '—';
                const qty = it.quantity ?? 0;
                const unit = it.unitPrice ?? 0;
                const lineTotal = it.totalPrice != null ? it.totalPrice : qty * unit;
                return `<tr>
                    <td>${htmlEscape(sku)}</td>
                    <td>${htmlEscape(name)}</td>
                    <td class="num">${htmlEscape(String(qty))}</td>
                    <td class="num">${htmlEscape(formatVND(unit))}</td>
                    <td class="num">${htmlEscape(formatVND(lineTotal))}</td>
                </tr>`;
            })
            .join('');

        const docTitle = `Phiếu nhập hàng ${si.code}`;
        const body = `
            <h1>${htmlEscape(docTitle)}</h1>
            <div class="meta">
                <div><strong>Nhà cung cấp:</strong> ${htmlEscape(supplierLabel)}</div>
                <div><strong>Chi nhánh:</strong> ${htmlEscape(branchLabel)}</div>
                <div><strong>Người tạo:</strong> ${htmlEscape(creator)} — ${htmlEscape(formatDate(si.createdAt))}</div>
                <div><strong>Trạng thái:</strong> ${htmlEscape(statusLabel)}</div>
                ${si.note?.trim() ? `<div><strong>Ghi chú:</strong> ${htmlEscape(si.note)}</div>` : ''}
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Mã hàng</th>
                        <th>Tên sản phẩm</th>
                        <th class="num">Số lượng</th>
                        <th class="num">Đơn giá</th>
                        <th class="num">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <p class="total">Tổng cộng: ${htmlEscape(formatVND(si.totalAmount))}</p>
        `;

        const html = `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>${htmlEscape(docTitle)}</title>
            <style>
                body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 16px; color: #111; font-size: 12px; }
                h1 { font-size: 18px; margin: 0 0 12px; }
                .meta { margin-bottom: 14px; line-height: 1.55; }
                table { width: 100%; border-collapse: collapse; margin-top: 8px; }
                th, td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
                th { background: #dbeafe; font-weight: 600; }
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

    const toggleExpand = async (si) => {
        const id = si._id;
        if (expandedId === id) {
            setExpandedId(null);
            setExpandedDetail(null);
            return;
        }
        setExpandedId(id);
        setExpandedDetail(null);
        const res = await getStockInById(id);
        if (res.success && res.data?.stockIn) {
            setExpandedDetail(res.data.stockIn);
        } else {
            toast.error('Không tải được chi tiết phiếu');
            setExpandedId(null);
        }
    };

    const handleConfirm = (si) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận phiếu nhập hàng',
            message: `Xác nhận phiếu ${si.code} sẽ cộng tồn kho theo số lượng nhập. Bạn có chắc?`,
            onConfirm: async () => {
                try {
                    await confirmStockIn(si._id);
                    toast.success('Đã xác nhận phiếu và cập nhật tồn kho');
                    setExpandedId(null);
                    setExpandedDetail(null);
                    fetchList();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xác nhận thất bại');
                }
            },
        });
    };

    const handleCancelStockIn = (si) => {
        const isConfirmed = si.status === 'confirmed';
        setConfirmModal({
            isOpen: true,
            title: 'Hủy phiếu nhập hàng',
            message: isConfirmed
                ? `Hủy phiếu ${si.code} sẽ trừ tồn kho (đảo ngược nhập hàng). Chỉ hủy được khi tồn đủ. Bạn có chắc?`
                : `Bạn có chắc muốn hủy phiếu ${si.code}? Hành động này không thể hoàn tác.`,
            onConfirm: async () => {
                try {
                    await deleteStockIn(si._id);
                    toast.success('Đã hủy phiếu nhập hàng');
                    setExpandedId(null);
                    setExpandedDetail(null);
                    fetchList();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Hủy phiếu thất bại');
                }
            },
        });
    };

    const openReturnModal = async (stockIn) => {
        if (stockIn.status !== 'confirmed') return;
        const code = await getNextStockReturnCode();
        setReturnCode(code || '');
        setReturnNote('');
        let returnedByProduct = {};
        let stockInData = stockIn;
        try {
            const res = await getStockInById(stockIn._id);
            if (res.success && res.data) {
                stockInData = res.data.stockIn || stockIn;
                returnedByProduct = res.data.returnedByProduct || {};
            }
        } catch {
            returnedByProduct = {};
        }
        const importedByProduct = {};
        for (const it of stockInData.items || []) {
            const pid = String(it.product?._id || it.product);
            importedByProduct[pid] = (importedByProduct[pid] || 0) + (it.quantity || 0);
        }
        const productList = [...new Map((stockInData.items || []).map((it) => {
            const pid = it.product?._id || it.product;
            return [String(pid), it.product || { _id: pid }];
        })).values()];
        const rows = productList
            .map((product) => {
                const pid = product?._id || product;
                const pidStr = String(pid);
                const imported = importedByProduct[pidStr] || 0;
                const alreadyReturned = returnedByProduct[pidStr] || 0;
                const maxReturnable = Math.max(0, imported - alreadyReturned);
                return {
                    product: typeof product === 'object' ? product : { _id: pid },
                    quantity: 0,
                    maxQuantity: maxReturnable,
                    imported,
                    alreadyReturned,
                    reason: '',
                };
            })
            .filter((r) => r.maxQuantity > 0);
        setReturnRows(rows);
        setShowReturnModal(stockIn);
    };

    const closeReturnModal = () => {
        setShowReturnModal(false);
        setReturnCode('');
        setReturnNote('');
        setReturnRows([]);
    };

    const updateReturnRow = (productId, field, value) => {
        setReturnRows((prev) =>
            prev.map((r) => {
                if ((r.product?._id || r.product) !== productId) return r;
                if (field === 'quantity') {
                    const v = Math.max(0, Math.min(r.maxQuantity, parseInt(value, 10) || 0));
                    return { ...r, quantity: v };
                }
                return { ...r, [field]: value };
            }),
        );
    };

    const handleReturnSubmit = async (e) => {
        e.preventDefault();
        const withQty = returnRows.filter((r) => r.quantity > 0);
        const merged = {};
        for (const r of withQty) {
            const pid = r.product?._id || r.product;
            if (!merged[pid]) merged[pid] = { product: pid, quantity: 0, reason: r.reason || '' };
            merged[pid].quantity += r.quantity;
        }
        const items = Object.values(merged);
        if (items.length === 0) {
            toast.error('Vui lòng chọn ít nhất một sản phẩm để trả');
            return;
        }
        setReturnSubmitting(true);
        try {
            const res = await createStockReturn({
                code: returnCode.trim(),
                stockInId: showReturnModal._id,
                note: returnNote.trim(),
                items,
            });
            if (res.success) {
                toast.success('Tạo phiếu trả hàng thành công');
                closeReturnModal();
                setExpandedId(null);
                setExpandedDetail(null);
                fetchList();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Tạo phiếu trả hàng thất bại');
        } finally {
            setReturnSubmitting(false);
        }
    };

    const totalAmount = createRows.reduce((s, r) => s + r.quantity * (r.unitPrice || 0), 0);

    const printLabelsForRow = (row) => {
        const qty = Number(row.quantity || 0);
        const raw = (row.product?.barcode || row.product?.sku || '').toString().trim();
        if (!raw) {
            toast.error('Sản phẩm thiếu mã vạch hoặc mã hàng để in tem');
            return;
        }
        if (qty < 1) {
            toast.error('Số lượng phải ≥ 1 để in tem');
            return;
        }
        try {
            const html = buildStockInPrintHtml({ product: row.product, quantity: qty });
            setPrintSrcDoc(stampPrintHtml(html));
        } catch (e) {
            toast.error(
                e?.message === 'MISSING_CODE'
                    ? 'Thiếu mã vạch hoặc mã hàng'
                    : e?.message === 'INVALID_CODE'
                      ? 'Mã không hợp lệ để tạo vạch (ký tự đặc biệt)'
                      : e?.message || 'Không tạo được tem in',
            );
            return;
        }
        setTimeout(() => {
            printFrameRef.current?.contentWindow?.focus?.();
        }, 0);
    };

    const printLabelsForStockInItem = (it) => {
        const qty = Number(it?.quantity || 0);
        const raw = (it?.product?.barcode || it?.product?.sku || '').toString().trim();
        if (!raw) {
            toast.error('Sản phẩm thiếu mã vạch hoặc mã hàng để in tem');
            return;
        }
        if (qty < 1) {
            toast.error('Số lượng phải ≥ 1 để in tem');
            return;
        }
        try {
            const html = buildStockInPrintHtml({ product: it.product, quantity: qty });
            setPrintSrcDoc(stampPrintHtml(html));
        } catch (e) {
            toast.error(
                e?.message === 'MISSING_CODE'
                    ? 'Thiếu mã vạch hoặc mã hàng'
                    : e?.message === 'INVALID_CODE'
                      ? 'Mã không hợp lệ để tạo vạch (ký tự đặc biệt)'
                      : e?.message || 'Không tạo được tem in',
            );
        }
    };

    return (
        <div className='min-h-full p-6 bg-base-200'>
            <div className='container mx-auto'>
                <h1 className='text-2xl font-bold text-base-content mb-6'>Nhập hàng</h1>

                <div className='space-y-4'>
                    <div className='flex flex-wrap items-end justify-between gap-4'>
                        <div className='flex flex-col gap-0.5'>
                            <span
                                className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 block'
                                aria-hidden
                            >
                                &nbsp;
                            </span>
                            <button
                                onClick={openCreateModal}
                                className='btn btn-primary gap-2'
                                type='button'
                            >
                                <Plus className='w-5 h-5' />
                                Tạo phiếu nhập hàng
                            </button>
                        </div>
                        <div className='flex flex-wrap items-end gap-2'>
                            <div className='flex flex-col gap-0.5'>
                                <label className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 leading-none flex items-end'>
                                    Mã phiếu
                                </label>
                                <input
                                    type='text'
                                    className='input input-bordered input-sm w-36'
                                    placeholder='Mã phiếu'
                                    value={filters.code}
                                    onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
                                />
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                <label className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 leading-none flex items-end'>
                                    Nhà cung cấp
                                </label>
                                <select
                                    className='select select-bordered select-sm w-44'
                                    value={filters.supplierId}
                                    onChange={(e) => setFilters((f) => ({ ...f, supplierId: e.target.value }))}
                                >
                                    <option value=''>Tất cả nhà cung cấp</option>
                                    {suppliers.map((s) => (
                                        <option key={s._id} value={s._id}>{s.code} - {s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                <label className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 leading-none flex items-end'>
                                    Từ ngày
                                </label>
                                <input
                                    type='date'
                                    className='input input-bordered input-sm w-40'
                                    value={filters.fromDate}
                                    title='Từ ngày'
                                    onChange={(e) => {
                                        const fromDate = e.target.value;
                                        setFilters((f) => {
                                            const next = { ...f, fromDate };
                                            if (!fromDate) {
                                                next.toDate = '';
                                            } else if (f.toDate && f.toDate < fromDate) {
                                                next.toDate = fromDate;
                                            }
                                            return next;
                                        });
                                    }}
                                />
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                <label className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 leading-none flex items-end'>
                                    Đến ngày
                                </label>
                                <input
                                    type='date'
                                    className='input input-bordered input-sm w-40 disabled:opacity-60'
                                    value={filters.toDate}
                                    title={
                                        filters.fromDate
                                            ? 'Đến ngày (không nhỏ hơn từ ngày)'
                                            : 'Chọn từ ngày trước'
                                    }
                                    disabled={!filters.fromDate}
                                    min={filters.fromDate || undefined}
                                    onChange={(e) => {
                                        const toDate = e.target.value;
                                        if (!filters.fromDate) return;
                                        if (toDate && toDate < filters.fromDate) return;
                                        setFilters((f) => ({ ...f, toDate }));
                                    }}
                                />
                            </div>
                            <div className='flex flex-col gap-0.5'>
                                <label className='text-[10px] uppercase tracking-wide text-base-content/50 h-3.5 shrink-0 leading-none flex items-end'>
                                    Trạng thái
                                </label>
                                <select
                                    className='select select-bordered select-sm w-36'
                                    value={filters.status}
                                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                                >
                                    <option value=''>Tất cả</option>
                                    <option value='draft'>Nháp</option>
                                    <option value='confirmed'>Đã xác nhận</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className='bg-base-100 rounded-lg shadow overflow-hidden'>
                        {loading ? (
                            <div className='flex justify-center py-12'>
                                <span className='loading loading-spinner loading-lg'></span>
                            </div>
                        ) : list.length === 0 ? (
                            <div className='text-center py-12 text-base-content/60'>
                                <p>Chưa có phiếu nhập hàng. Bấm &quot;Tạo phiếu nhập hàng&quot; để tạo mới.</p>
                            </div>
                        ) : (
                            <>
                                <div className='overflow-x-auto w-full'>
                                    <table className='table w-full min-w-full'>
                                        <thead className='bg-blue-100 sticky top-0 z-20'>
                                            <tr>
                                                <th className='w-8'></th>
                                                <th>Mã phiếu</th>
                                                <th>Nhà cung cấp</th>
                                                <th>Chi nhánh</th>
                                                <th>Ngày tạo</th>
                                                <th className='text-right'>Tổng tiền</th>
                                                <th>Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((si) => {
                                                const isExpanded = expandedId === si._id;
                                                return (
                                                    <React.Fragment key={si._id}>
                                                        <tr
                                                            className={`hover:bg-base-200/60 cursor-pointer ${isExpanded ? 'bg-primary/10' : ''}`}
                                                            onClick={() => toggleExpand(si)}
                                                        >
                                                            <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>{isExpanded ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}</td>
                                                            <td className='font-medium'>{si.code}</td>
                                                            <td>{si.supplier ? `${si.supplier.code} - ${si.supplier.name}` : '—'}</td>
                                                            <td>{si.location ? `${si.location.code} - ${si.location.name}` : '—'}</td>
                                                            <td>{formatDate(si.createdAt)}</td>
                                                            <td className='text-right'>{formatVND(si.totalAmount)}</td>
                                                            <td>
                                                                <span className={`badge badge-sm ${si.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                                                                    {si.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className='bg-primary/5'>
                                                                <td
                                                                    colSpan={7}
                                                                    className='p-4 border-l-4 border-l-primary'
                                                                >
                                                                    {!expandedDetail ? (
                                                                        <div className='flex justify-center py-6'>
                                                                            <span className='loading loading-spinner loading-md' />
                                                                        </div>
                                                                    ) : (
                                                                        <div
                                                                            className='space-y-4'
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <div className='flex flex-wrap gap-6 text-sm'>
                                                                                <p>
                                                                                    <span className='font-medium text-base-content/70'>Nhà cung cấp:</span>{' '}
                                                                                    {expandedDetail.supplier
                                                                                        ? `${expandedDetail.supplier.code} - ${expandedDetail.supplier.name}`
                                                                                        : '—'}
                                                                                </p>
                                                                                <p>
                                                                                    <span className='font-medium text-base-content/70'>Chi nhánh:</span>{' '}
                                                                                    {expandedDetail.location
                                                                                        ? `${expandedDetail.location.code} - ${expandedDetail.location.name}`
                                                                                        : '—'}
                                                                                </p>
                                                                                <p>
                                                                                    <span className='font-medium text-base-content/70'>Người tạo:</span>{' '}
                                                                                    {expandedDetail.createdBy
                                                                                        ? `${expandedDetail.createdBy.firstName || ''} ${expandedDetail.createdBy.lastName || ''}`.trim() ||
                                                                                          expandedDetail.createdBy.username
                                                                                        : '—'}{' '}
                                                                                    — {formatDate(expandedDetail.createdAt)}
                                                                                </p>
                                                                            </div>
                                                                            <div>
                                                                                {' '}
                                                                                {expandedDetail.note ? (
                                                                                    <p>
                                                                                        <span className='font-medium text-base-content/70'>Ghi chú:</span> {expandedDetail.note}
                                                                                    </p>
                                                                                ) : null}
                                                                            </div>
                                                                            <div className='overflow-x-auto border border-base-300 rounded-lg w-full'>
                                                                                <table className='table table-sm w-full min-w-full'>
                                                                                    <thead className='bg-blue-100 sticky top-0 z-20'>
                                                                                        <tr>
                                                                                            <th>Mã hàng</th>
                                                                                            <th>Tên sản phẩm</th>
                                                                                            <th className='text-right'>Số lượng</th>
                                                                                            <th className='text-right'>Đơn giá</th>
                                                                                            <th className='text-right'>Thành tiền</th>
                                                                                            <th className='text-center'>In tem</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {expandedDetail.items?.map((it, idx) => (
                                                                                            <tr key={idx}>
                                                                                                <td>{it.product?.sku || '—'}</td>
                                                                                                <td>{it.product?.name || '—'}</td>
                                                                                                <td className='text-right'>{it.quantity}</td>
                                                                                                <td className='text-right'>{formatVND(it.unitPrice)}</td>
                                                                                                <td className='text-right'>{formatVND(it.totalPrice)}</td>
                                                                                                <td className='text-center'>
                                                                                                    <button
                                                                                                        type='button'
                                                                                                        className='btn btn-primary btn-xs gap-1'
                                                                                                        onClick={() => printLabelsForStockInItem(it)}
                                                                                                        title='In tem theo số lượng dòng (layout 70×22mm)'
                                                                                                    >
                                                                                                        <Printer className='w-3.5 h-3.5' />
                                                                                                        In
                                                                                                    </button>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                            <div className='flex flex-wrap justify-between items-center gap-2 mt-2'>
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-outline btn-sm gap-2'
                                                                                    onClick={handlePrintStockInTable}
                                                                                    title='In bảng chi tiết phiếu nhập'
                                                                                >
                                                                                    <Printer className='w-4 h-4' />
                                                                                    In phiếu nhập
                                                                                </button>
                                                                                <p className='font-bold'>
                                                                                    Tổng: {formatVND(expandedDetail.totalAmount)}
                                                                                </p>
                                                                            </div>
                                                                            {expandedDetail.status === 'draft' && (
                                                                                <div className='flex gap-2'>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-outline btn-sm gap-2'
                                                                                        onClick={() => openEditModal(expandedDetail)}
                                                                                    >
                                                                                        <Pencil className='w-4 h-4' />
                                                                                        Chỉnh sửa
                                                                                    </button>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-outline btn-error btn-sm gap-2'
                                                                                        onClick={() => handleCancelStockIn(expandedDetail)}
                                                                                    >
                                                                                        <Trash2 className='w-4 h-4' />
                                                                                        Hủy phiếu
                                                                                    </button>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-primary btn-sm gap-2'
                                                                                        onClick={() => handleConfirm(expandedDetail)}
                                                                                    >
                                                                                        <CheckCircle className='w-4 h-4' />
                                                                                        Xác nhận phiếu nhập
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                            {expandedDetail.status === 'confirmed' && (
                                                                                <div className='flex gap-2'>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-outline btn-sm gap-2'
                                                                                        onClick={() => openReturnModal(expandedDetail)}
                                                                                    >
                                                                                        <RotateCcw className='w-4 h-4' />
                                                                                        Trả hàng
                                                                                    </button>
                                                                                    <button
                                                                                        type='button'
                                                                                        className='btn btn-outline btn-error btn-sm gap-2'
                                                                                        onClick={() => handleCancelStockIn(expandedDetail)}
                                                                                    >
                                                                                        <Trash2 className='w-4 h-4' />
                                                                                        Hủy phiếu
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {pagination.totalPages > 1 && (
                                    <div className='flex justify-center gap-2 p-4'>
                                        <button
                                            className='btn btn-sm'
                                            disabled={pagination.page <= 1}
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                        >
                                            «
                                        </button>
                                        <span className='flex items-center px-4'>
                                            Trang {pagination.page} / {pagination.totalPages}
                                        </span>
                                        <button
                                            className='btn btn-sm'
                                            disabled={pagination.page >= pagination.totalPages}
                                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                        >
                                            »
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Modal tạo phiếu nhập */}
                {showCreateModal && (
                    <ModalPortal>
                    <dialog
                        className='modal modal-open'
                        data-theme='light'
                        role='dialog'
                        aria-modal='true'
                    >
                        <div className='modal-box flex flex-col max-w-7xl h-[90vh] max-h-[90vh] p-0 bg-white text-base-content border border-base-200 shadow-2xl'>
                            <div className='px-6 pt-6 pb-4 shrink-0 bg-white'>
                                <h3 className='font-bold text-lg text-base-content'>{editingStockInId ? 'Chỉnh sửa phiếu nhập hàng' : 'Tạo phiếu nhập hàng'}</h3>
                            </div>
                            <form
                                onSubmit={handleCreateSubmit}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                                className='flex flex-col flex-1 min-h-0'
                            >
                                <div className='flex-1 overflow-y-auto px-6 space-y-4 bg-white'>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <label className='label'>
                                                <span className='label-text font-semibold text-base-content'>Mã phiếu</span>
                                            </label>
                                            <input
                                                type='text'
                                                className='input input-bordered w-full'
                                                value={createCode}
                                                onChange={(e) => setCreateCode(e.target.value)}
                                                placeholder='NH-YYYYMMDD-001'
                                                readOnly={!!editingStockInId}
                                            />
                                        </div>
                                        <div>
                                            <label className='label'>
                                                <span className='label-text font-semibold'>
                                                    Chi nhánh <span className='text-error'>*</span>
                                                </span>
                                            </label>
                                            <select
                                                className='select select-bordered w-full'
                                                value={createLocationId}
                                                onChange={(e) => setCreateLocationId(e.target.value)}
                                                required
                                            >
                                                <option value=''>-- Chọn chi nhánh --</option>
                                                {locations.map((loc) => (
                                                    <option
                                                        key={loc._id}
                                                        value={loc._id}
                                                    >
                                                        {loc.code} - {loc.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <SupplierSelect
                                                label='Nhà cung cấp'
                                                value={createSupplierId}
                                                onChange={(id) => setCreateSupplierId(id || '')}
                                                onCreateNew={handleCreateSupplier}
                                                onEdit={handleEditSupplier}
                                                placeholder='Chọn nhà cung cấp (tùy chọn)'
                                                refreshKey={supplierRefreshKey}
                                            />
                                        </div>
                                        <div>
                                            <label className='label'>
                                                <span className='label-text'>Ghi chú</span>
                                            </label>
                                            <input
                                                type='text'
                                                className='input input-bordered w-full'
                                                value={createNote}
                                                onChange={(e) => setCreateNote(e.target.value)}
                                                placeholder='Tùy chọn'
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className='label'>
                                            <span className='label-text font-semibold'>Sản phẩm nhập</span>
                                        </label>
                                        <p className='text-xs text-base-content/60 -mt-1 mb-2'>
                                            Mỗi dòng hàng = 1 SKU. Cột Tem: in nhãn mã vạch theo số lượng dòng.
                                        </p>
                                        <div
                                            className='relative mb-4'
                                            ref={productSearchRef}
                                        >
                                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10' />
                                            <input
                                                type='text'
                                                className='input input-bordered w-full pl-10'
                                                placeholder='Tìm theo mã hàng, mã vạch hoặc tên sản phẩm...'
                                                value={productSearch}
                                                onChange={(e) => setProductSearch(e.target.value)}
                                                onFocus={() => productSearch.trim() && setProductSearchOpen(true)}
                                            />
                                            {productSearchOpen && (
                                                <div className='absolute z-50 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto'>
                                                    {productSearchLoading ? (
                                                        <div className='p-4 text-center text-sm text-base-content/60'>Đang tìm...</div>
                                                    ) : productSearchResults.length === 0 ? (
                                                        <div className='p-4 text-center text-sm text-base-content/60'>
                                                            {productSearch.trim() ? 'Không tìm thấy sản phẩm' : 'Nhập mã hoặc tên để tìm'}
                                                        </div>
                                                    ) : (
                                                        <ul className='menu p-2'>
                                                            {productSearchResults
                                                                .filter((p) => !createRows.some((r) => r.product._id === p._id))
                                                                .map((p) => {
                                                                    const imgUrl = p.images?.[0] || p.image || '';
                                                                    const stock = createLocationId ? (p.stockAtLocation ?? 0) : null;
                                                                    const price = p.costPrice ?? p.price ?? 0;
                                                                    return (
                                                                        <li key={p._id}>
                                                                            <button
                                                                                type='button'
                                                                                onClick={() => addProductToRows(p)}
                                                                                className='flex items-center gap-3 py-2'
                                                                            >
                                                                                <div className='w-10 h-10 rounded-lg bg-base-200 shrink-0 overflow-hidden flex items-center justify-center'>
                                                                                    {imgUrl ? (
                                                                                        <img
                                                                                            src={imgUrl}
                                                                                            alt=''
                                                                                            className='w-full h-full object-cover'
                                                                                        />
                                                                                    ) : (
                                                                                        <Package className='w-5 h-5 text-base-content/40' />
                                                                                    )}
                                                                                </div>
                                                                                <div className='flex-1 text-left min-w-0'>
                                                                                    <span className='font-medium'>{p.sku}</span> — {p.name}
                                                                                    <span className='block text-xs text-base-content/60 mt-0.5'>
                                                                                        Tồn: {stock !== null ? stock : '—'} · Giá: {formatVND(price)}
                                                                                    </span>
                                                                                </div>
                                                                            </button>
                                                                        </li>
                                                                    );
                                                                })}
                                                            {productSearchResults.filter((p) => !createRows.some((r) => r.product._id === p._id)).length === 0 && (
                                                                <li className='text-base-content/60 text-sm px-4 py-2'>Tất cả sản phẩm tìm được đã có trong phiếu</li>
                                                            )}
                                                        </ul>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className='overflow-x-auto border border-base-300 rounded-lg'>
                                            <table className='table table-sm'>
                                                <thead className='bg-blue-100 sticky top-0 z-20'>
                                                    <tr>
                                                        <th className='w-12'></th>
                                                        <th>Mã hàng</th>
                                                        <th>Tên sản phẩm</th>
                                                        <th className='text-right'>Số lượng</th>
                                                        <th className='text-right'>Đơn giá (VNĐ)</th>
                                                        <th className='text-right'>Thành tiền</th>
                                                        <th className='text-center'>Tem</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {createRows.map((r) => {
                                                        const imgUrl = r.product.images?.[0] || r.product.image || '';
                                                        return (
                                                            <tr key={r.product._id}>
                                                                <td className='w-12'>
                                                                    <div className='w-10 h-10 rounded-lg bg-base-200 overflow-hidden flex items-center justify-center'>
                                                                        {imgUrl ? (
                                                                            <img
                                                                                src={imgUrl}
                                                                                alt=''
                                                                                className='w-full h-full object-cover'
                                                                            />
                                                                        ) : (
                                                                            <Package className='w-5 h-5 text-base-content/40' />
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className='font-medium'>{r.product.sku}</td>
                                                                <td>{r.product.name}</td>
                                                                <td className='text-right'>
                                                                    <div className='join flex justify-end'>
                                                                        <button
                                                                            type='button'
                                                                            className='join-item btn btn-sm btn-square min-h-0 h-8 w-8 rounded-l-lg'
                                                                            onClick={() => updateRow(r.product._id, 'quantity', Math.max(1, r.quantity - 1))}
                                                                            aria-label='Giảm'
                                                                            disabled={r.quantity <= 1}
                                                                        >
                                                                            <ChevronDown className='w-4 h-4' />
                                                                        </button>
                                                                        <input
                                                                            type='number'
                                                                            min={1}
                                                                            className='join-item input input-bordered input-sm w-14 text-center rounded-none border-x-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                                                                            value={r.quantity}
                                                                            onChange={(e) => updateRow(r.product._id, 'quantity', e.target.value)}
                                                                        />
                                                                        <button
                                                                            type='button'
                                                                            className='join-item btn btn-sm btn-square min-h-0 h-8 w-8 rounded-r-lg'
                                                                            onClick={() => updateRow(r.product._id, 'quantity', r.quantity + 1)}
                                                                            aria-label='Tăng'
                                                                        >
                                                                            <ChevronUp className='w-4 h-4' />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td className='text-right'>
                                                                    <input
                                                                        type='number'
                                                                        min={0}
                                                                        className='input input-bordered input-sm w-28 text-right pe-5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                                                                        value={r.unitPrice}
                                                                        onChange={(e) => updateRow(r.product._id, 'unitPrice', e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className='text-right font-medium'> {formatVND(r.quantity * (r.unitPrice || 0))}</td>
                                                                <td className='text-center'>
                                                                    <button
                                                                        type='button'
                                                                        className='btn btn-primary btn-xs gap-1'
                                                                        onClick={() => printLabelsForRow(r)}
                                                                        title='In tem theo số lượng dòng (70×22mm)'
                                                                    >
                                                                        <Printer className='w-3.5 h-3.5' />
                                                                        In
                                                                    </button>
                                                                </td>
                                                                <td>
                                                                    <button
                                                                        type='button'
                                                                        className='btn btn-ghost btn-xs text-error'
                                                                        onClick={() => removeRow(r.product._id)}
                                                                    >
                                                                        <X className='w-4 h-4' />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {createRows.length === 0 && (
                                            <p className='text-base-content/50 text-sm py-4 text-center'>Chưa thêm sản phẩm. Tìm theo mã hoặc tên sản phẩm để thêm.</p>
                                        )}
                                        {createRows.length > 0 && <p className='text-right font-bold mt-2'>Tổng: {formatVND(totalAmount)}</p>}
                                    </div>
                                </div>
                                <div className='modal-action mt-auto shrink-0 px-6 py-4 border-t border-base-200 bg-white'>
                                    <button
                                        type='button'
                                        className='btn btn-ghost'
                                        onClick={closeCreateModal}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type='submit'
                                        className='btn btn-primary'
                                        disabled={submitting || createRows.length === 0}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className='loading loading-spinner loading-sm' />
                                                {editingStockInId ? 'Đang lưu...' : 'Đang tạo...'}
                                            </>
                                        ) : editingStockInId ? (
                                            'Lưu thay đổi'
                                        ) : (
                                            'Tạo phiếu'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <form
                            method='dialog'
                            className='modal-backdrop'
                        >
                            <button
                                type='button'
                                onClick={closeCreateModal}
                            >
                                Đóng
                            </button>
                        </form>
                    </dialog>
                    </ModalPortal>
                )}

                {/* Iframe in tem (ẩn) */}
                <iframe
                    ref={printFrameRef}
                    title="print-labels"
                    style={{ position: 'absolute', width: 0, height: 0, border: 0 }}
                    srcDoc={printSrcDoc}
                    onLoad={() => {
                        if (!printSrcDoc) return;
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                try {
                                    printFrameRef.current?.contentWindow?.focus();
                                    printFrameRef.current?.contentWindow?.print();
                                } catch {
                                    // ignore
                                }
                            });
                        });
                    }}
                />

                {/* Modal trả hàng */}
                {showReturnModal && (
                    <ModalPortal>
                    <dialog
                        className='modal modal-open'
                        data-theme='light'
                        role='dialog'
                        aria-modal='true'
                    >
                        <div className='modal-box flex flex-col max-w-4xl max-h-[90vh] p-0 bg-white text-base-content border border-base-200 shadow-2xl'>
                            <div className='px-6 pt-6 pb-4 shrink-0 bg-white'>
                                <h3 className='font-bold text-lg text-base-content'>Trả hàng — Phiếu nhập: {showReturnModal.code}</h3>
                                <p className='text-sm text-base-content/60 mt-1'>
                                    Nhà cung cấp: {showReturnModal.supplier ? `${showReturnModal.supplier.code} - ${showReturnModal.supplier.name}` : '—'}
                                </p>
                            </div>
                            <form
                                onSubmit={handleReturnSubmit}
                                className='flex flex-col flex-1 min-h-0'
                            >
                                <div className='flex-1 overflow-y-auto px-6 space-y-4 bg-white'>
                                    <div>
                                        <label className='label'>
                                            <span className='label-text font-semibold'>Mã phiếu trả</span>
                                        </label>
                                        <input
                                            type='text'
                                            className='input input-bordered w-full'
                                            value={returnCode}
                                            onChange={(e) => setReturnCode(e.target.value)}
                                            placeholder='TH-YYYYMMDD-001'
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className='label'>
                                            <span className='label-text'>Ghi chú</span>
                                        </label>
                                        <input
                                            type='text'
                                            className='input input-bordered w-full'
                                            value={returnNote}
                                            onChange={(e) => setReturnNote(e.target.value)}
                                            placeholder='Tùy chọn'
                                        />
                                    </div>
                                    <div>
                                        <label className='label'>
                                            <span className='label-text font-semibold'>Sản phẩm trả</span>
                                        </label>
                                        {returnRows.length === 0 ? (
                                            <div className='py-8 text-center text-base-content/70 bg-base-200 rounded-lg'>
                                                Đã trả toàn bộ
                                            </div>
                                        ) : (
                                        <div className='overflow-x-auto border border-base-300 rounded-lg'>
                                            <table className='table table-sm w-full'>
                                                <thead className='bg-blue-100 sticky top-0 z-20'>
                                                    <tr>
                                                        <th>Mã hàng</th>
                                                        <th>Tên sản phẩm</th>
                                                        <th className='text-right'>Số lượng còn lại</th>
                                                        <th className='text-right'>Số lượng trả</th>
                                                        <th>Lý do</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {returnRows.map((r) => {
                                                        const pid = r.product?._id || r.product;
                                                        const product = r.product;
                                                        return (
                                                            <tr key={pid}>
                                                                <td className='font-medium'>{product?.sku || '—'}</td>
                                                                <td>{product?.name || '—'}</td>
                                                                <td className='text-right'>{Math.max(0, (r.imported || 0) - (r.alreadyReturned || 0))}</td>
                                                                <td className='text-right'>
                                                                    <div className='join flex justify-end'>
                                                                        <button
                                                                            type='button'
                                                                            className='join-item btn btn-sm btn-square min-h-0 h-8 w-8 rounded-l-lg'
                                                                            onClick={() => updateReturnRow(pid, 'quantity', r.quantity - 1)}
                                                                            aria-label='Giảm'
                                                                            disabled={r.quantity <= 0}
                                                                        >
                                                                            <ChevronDown className='w-4 h-4' />
                                                                        </button>
                                                                        <input
                                                                            type='number'
                                                                            min={0}
                                                                            max={r.maxQuantity}
                                                                            className='join-item input input-bordered input-sm w-14 text-center rounded-none border-x-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                                                                            value={r.quantity}
                                                                            onChange={(e) => updateReturnRow(pid, 'quantity', e.target.value)}
                                                                        />
                                                                        <button
                                                                            type='button'
                                                                            className='join-item btn btn-sm btn-square min-h-0 h-8 w-8 rounded-r-lg'
                                                                            onClick={() => updateReturnRow(pid, 'quantity', r.quantity + 1)}
                                                                            aria-label='Tăng'
                                                                            disabled={r.quantity >= r.maxQuantity}
                                                                        >
                                                                            <ChevronUp className='w-4 h-4' />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type='text'
                                                                        className='input input-bordered input-sm w-full'
                                                                        value={r.reason}
                                                                        onChange={(e) => updateReturnRow(pid, 'reason', e.target.value)}
                                                                        placeholder='Tùy chọn'
                                                                    />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        )}
                                        {returnRows.length > 0 && (
                                            <p className='text-sm text-base-content/60 mt-2'>
                                                Nhập số lượng cần trả cho từng sản phẩm (tối đa bằng số còn lại). Số lượng trả sẽ trừ khỏi tồn kho.
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className='modal-action mt-auto shrink-0 px-6 py-4 border-t border-base-200 bg-white'>
                                    {returnRows.length === 0 ? (
                                        <button
                                            type='button'
                                            className='btn btn-primary'
                                            onClick={closeReturnModal}
                                        >
                                            Đóng
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type='button'
                                                className='btn btn-ghost'
                                                onClick={closeReturnModal}
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type='submit'
                                                className='btn btn-primary'
                                                disabled={returnSubmitting || returnRows.every((r) => r.quantity <= 0)}
                                            >
                                                {returnSubmitting ? (
                                                    <>
                                                        <span className='loading loading-spinner loading-sm' />
                                                        Đang tạo...
                                                    </>
                                                ) : (
                                                    'Tạo phiếu trả hàng'
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </form>
                        </div>
                        <form
                            method='dialog'
                            className='modal-backdrop'
                        >
                            <button
                                type='button'
                                onClick={closeReturnModal}
                            >
                                Đóng
                            </button>
                        </form>
                    </dialog>
                    </ModalPortal>
                )}

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                />

                {showSupplierModal && (
                    <SupplierModal
                        supplier={editingSupplier}
                        onClose={() => {
                            setShowSupplierModal(false);
                            setEditingSupplier(null);
                        }}
                        onSubmit={handleSaveSupplier}
                        submitting={supplierSubmitting}
                    />
                )}
            </div>
        </div>
    );
};

export default ImportGoodsPage;
