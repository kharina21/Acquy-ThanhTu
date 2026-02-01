import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Package, Upload, Search, Pencil, X, Trash2, Plus, Printer, FileSpreadsheet } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import {
    getProducts,
    getProductOptions,
    createProduct,
    updateProduct,
    deleteProduct,
    importProductsFromExcel,
    generateSampleExcelBlob,
} from '@/services/productService';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const emptyProductForm = () => ({
    category: '',
    brand: '',
    sku: '',
    barcode: '',
    name: '',
    capacity: '',
    costPrice: 0,
    price: 0,
    quantity: 0,
    image: '',
    isActive: true,
    warrantyText: '',
    warrantyMonths: '',
    notes: '',
});

const ProductListTab = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [importing, setImporting] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState(emptyProductForm());
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, onConfirm: null });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState(emptyProductForm());
    const [productOptions, setProductOptions] = useState({ category: [], brand: [] });
    const [addedCategories, setAddedCategories] = useState([]);
    const [addedBrands, setAddedBrands] = useState([]);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [addCategoryFormType, setAddCategoryFormType] = useState('create');
    const [showAddBrandModal, setShowAddBrandModal] = useState(false);
    const [newBrandInput, setNewBrandInput] = useState('');
    const [addBrandFormType, setAddBrandFormType] = useState('create');
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [barcodePrintQty, setBarcodePrintQty] = useState(1);
    const [barcodeShowPrice, setBarcodeShowPrice] = useState(true);
    const [barcodeShowStoreName, setBarcodeShowStoreName] = useState(true);

    const optionCategories = useMemo(() => {
        const set = new Set([...(productOptions.category || []), ...addedCategories]);
        return [...set].filter(Boolean).sort((a, b) => String(a).localeCompare(b));
    }, [productOptions.category, addedCategories]);

    const optionBrands = useMemo(() => {
        const set = new Set([...(productOptions.brand || []), ...addedBrands]);
        return [...set].filter(Boolean).sort((a, b) => String(a).localeCompare(b));
    }, [productOptions.brand, addedBrands]);

    const fetchProducts = async () => {
        setLoading(true);
        const res = await getProducts({ page: pagination.page, limit: pagination.limit, search });
        if (res.success) {
            setProducts(res.data.products);
            setPagination(res.data.pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [pagination.page, search]);

    const fetchProductOptions = async () => {
        const res = await getProductOptions();
        if (res.success && res.data) setProductOptions(res.data);
    };

    useEffect(() => {
        fetchProductOptions();
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const handleDownloadSample = () => {
        try {
            const blob = generateSampleExcelBlob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sample-product.xlsx';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã tải file mẫu');
        } catch (err) {
            toast.error('Không thể tạo file mẫu');
        }
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const ext = (file.name || '').toLowerCase();
            if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
                toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
                return;
            }
            setImportFile(file.name);
            setImporting(true);
            try {
                const result = await importProductsFromExcel(file);
                if (result.success) {
                    toast.success(result.message || 'Import thành công');
                    fetchProducts();
                    fetchProductOptions();
                } else {
                    toast.error(result.message || 'Import thất bại');
                }
            } catch (err) {
                toast.error(err.message || 'Import thất bại. Kiểm tra định dạng file.');
            } finally {
                setImporting(false);
                setImportFile(null);
            }
        };
        input.click();
    };

    const handleRowClick = (p) => {
        setSelectedProduct(p);
        setShowDetailModal(true);
        setShowEditModal(false);
    };

    const openEditModal = () => {
        if (!selectedProduct) return;
        setEditFormData({
            category: selectedProduct.category ?? '',
            brand: selectedProduct.brand ?? '',
            sku: selectedProduct.sku ?? '',
            barcode: selectedProduct.barcode ?? '',
            name: selectedProduct.name ?? '',
            capacity: selectedProduct.capacity ?? '',
            costPrice: selectedProduct.costPrice ?? 0,
            price: selectedProduct.price ?? 0,
            quantity: selectedProduct.quantity ?? 0,
            image: selectedProduct.image ?? '',
            isActive: selectedProduct.isActive ?? true,
            warrantyText: selectedProduct.warrantyText ?? '',
            warrantyMonths: selectedProduct.warrantyMonths ?? '',
            notes: selectedProduct.notes ?? '',
        });
        setShowDetailModal(false);
        setShowEditModal(true);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        if (!selectedProduct?._id) return;
        setSubmitting(true);
        try {
            const payload = {
                ...editFormData,
                costPrice: Number(editFormData.costPrice) || 0,
                price: Number(editFormData.price) || 0,
                quantity: Number(editFormData.quantity) || 0,
                warrantyMonths: editFormData.warrantyMonths === '' ? null : Number(editFormData.warrantyMonths) || null,
            };
            await updateProduct(selectedProduct._id, payload);
            toast.success('Cập nhật sản phẩm thành công');
            setShowEditModal(false);
            setSelectedProduct(null);
            setEditFormData(emptyProductForm());
            fetchProducts();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Cập nhật thất bại';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedProduct(null);
    };

    const openBarcodeModal = () => {
        setBarcodePrintQty(1);
        setBarcodeShowPrice(true);
        setBarcodeShowStoreName(true);
        setShowBarcodeModal(true);
    };

    const handlePrintBarcode = (template) => {
        if (!selectedProduct) return;
        const barcodeValue = (selectedProduct.barcode || selectedProduct.sku || '').toString().replace(/[^\w\s-]/g, '');
        if (!barcodeValue) {
            toast.error('Sản phẩm chưa có mã vạch hoặc mã hàng');
            return;
        }
        const qty = Math.min(5000, Math.max(1, parseInt(barcodePrintQty, 10) || 1));
        const canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, barcodeValue, { format: 'CODE128', width: 2, height: 40, displayValue: true });
        } catch (e) {
            toast.error('Không tạo được mã vạch. Kiểm tra mã không chứa ký tự đặc biệt.');
            return;
        }
        const barcodeDataUrl = canvas.toDataURL('image/png');
        const storeName = barcodeShowStoreName ? 'Cửa hàng' : '';
        const priceStr = barcodeShowPrice && (selectedProduct.price != null) ? formatVND(selectedProduct.price) : '';
        const name = (selectedProduct.name || selectedProduct.sku || '').toString();
        const widthStyle = typeof template.width === 'number' || /^\d+$/.test(String(template.width)) ? `${template.width}mm` : '50mm';
        const labelHtml = Array(qty)
            .fill(0)
            .map(
                () => `
          <div class="barcode-label" style="border:1px solid #ddd;padding:8px;margin:4px;page-break-inside:avoid;display:inline-block;text-align:center;min-width:${widthStyle};">
            <div style="font-size:11px;font-weight:bold;margin-bottom:2px;">${name}</div>
            <img src="${barcodeDataUrl}" alt="barcode" style="max-width:100%;height:40px;" />
            ${priceStr ? `<div style="font-size:11px;">${priceStr}</div>` : ''}
          </div>
        `
            )
            .join('');
        const win = window.open('', '_blank');
        win.document.write(`
          <!DOCTYPE html><html><head><title>In tem mã - ${selectedProduct.sku}</title>
          <style>body{font-family:Arial,sans-serif;padding:12px;} @media print{.barcode-label{break-inside:avoid;}}</style></head>
          <body>${labelHtml}</body></html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => {
            win.print();
            win.close();
        }, 300);
    };

    const handleExportBarcodeExcel = () => {
        if (!selectedProduct) return;
        try {
            const headers = ['Mã hàng', 'Mã vạch', 'Tên sản phẩm', 'Giá (VNĐ)', 'Số thứ tự'];
            const priceVal = barcodeShowPrice && selectedProduct.price != null ? selectedProduct.price : '';
            const qty = Math.min(5000, Math.max(1, parseInt(barcodePrintQty, 10) || 1));
            const rows = Array.from({ length: qty }, (_, i) => [
                selectedProduct.sku || '',
                selectedProduct.barcode || selectedProduct.sku || '',
                selectedProduct.name || '',
                priceVal,
                i + 1,
            ]);
            const data = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Ma vach');
            const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ma-vach-${(selectedProduct.sku || 'san-pham').replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã xuất file Excel mã vạch');
        } catch (err) {
            console.error('handleExportBarcodeExcel error:', err);
            toast.error('Xuất file Excel thất bại. Vui lòng thử lại.');
        }
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        setEditFormData(emptyProductForm());
        if (selectedProduct) setShowDetailModal(true);
    };

    const openCreateModal = () => {
        setCreateFormData(emptyProductForm());
        setShowCreateModal(true);
    };

    const openAddCategoryModal = (formType) => {
        setAddCategoryFormType(formType);
        setNewCategoryInput('');
        setShowAddCategoryModal(true);
    };

    const openAddBrandModal = (formType) => {
        setAddBrandFormType(formType);
        setNewBrandInput('');
        setShowAddBrandModal(true);
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        const value = newCategoryInput.trim();
        if (!value) {
            toast.error('Vui lòng nhập tên loại hàng');
            return;
        }
        setAddedCategories((prev) => (prev.includes(value) ? prev : [...prev, value]));
        if (addCategoryFormType === 'create') {
            setCreateFormData((prev) => ({ ...prev, category: value }));
        } else {
            setEditFormData((prev) => ({ ...prev, category: value }));
        }
        setNewCategoryInput('');
        setShowAddCategoryModal(false);
        toast.success('Đã thêm loại hàng');
    };

    const handleAddBrand = (e) => {
        e.preventDefault();
        const value = newBrandInput.trim();
        if (!value) {
            toast.error('Vui lòng nhập tên thương hiệu');
            return;
        }
        setAddedBrands((prev) => (prev.includes(value) ? prev : [...prev, value]));
        if (addBrandFormType === 'create') {
            setCreateFormData((prev) => ({ ...prev, brand: value }));
        } else {
            setEditFormData((prev) => ({ ...prev, brand: value }));
        }
        setNewBrandInput('');
        setShowAddBrandModal(false);
        toast.success('Đã thêm thương hiệu');
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setCreateFormData(emptyProductForm());
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...createFormData,
                costPrice: Number(createFormData.costPrice) || 0,
                price: Number(createFormData.price) || 0,
                quantity: Number(createFormData.quantity) || 0,
                warrantyMonths: createFormData.warrantyMonths === '' ? null : Number(createFormData.warrantyMonths) || null,
            };
            await createProduct(payload);
            toast.success('Thêm sản phẩm thành công');
            closeCreateModal();
            fetchProducts();
            fetchProductOptions();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Thêm sản phẩm thất bại';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedProduct) return;
        const qty = selectedProduct.quantity ?? 0;
        if (qty > 0) {
            toast.error('Vui lòng đưa tồn kho về 0 trước khi xóa sản phẩm.');
            return;
        }
        setConfirmDeleteModal({
            isOpen: true,
            onConfirm: handleConfirmDelete,
        });
    };

    const handleConfirmDelete = async () => {
        if (!selectedProduct?._id) return;
        try {
            await deleteProduct(selectedProduct._id);
            toast.success('Đã xóa sản phẩm');
            setConfirmDeleteModal({ isOpen: false, onConfirm: null });
            setShowDetailModal(false);
            setShowEditModal(false);
            setSelectedProduct(null);
            fetchProducts();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Xóa thất bại';
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                        <input
                            type="text"
                            placeholder="Tìm theo tên, mã hàng, thương hiệu..."
                            className="input input-bordered w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        Tìm kiếm
                    </button>
                </form>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-2"
                        onClick={openCreateModal}
                    >
                        <Plus className="w-4 h-4" />
                        Thêm sản phẩm
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm gap-2"
                        onClick={handleDownloadSample}
                    >
                        <Package className="w-4 h-4" />
                        Tải file mẫu
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary btn-sm gap-2"
                        onClick={handleImportClick}
                        disabled={importing}
                    >
                        <Upload className="w-4 h-4" />
                        {importing ? 'Đang import...' : 'Import từ Excel'}
                    </button>
                </div>
            </div>

            <div className="bg-base-100 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center text-base-content/60">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Chưa có sản phẩm. Bấm &quot;Thêm sản phẩm&quot; hoặc import từ file Excel (dùng file mẫu) để thêm.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-zebra">
                            <thead>
                                <tr>
                                    <th>Mã hàng</th>
                                    <th>Tên hàng</th>
                                    <th>Thương hiệu</th>
                                    <th>Dung lượng (Ah)</th>
                                    <th className="text-right">Đơn giá nhập</th>
                                    <th className="text-right">Đơn giá bán</th>
                                    <th className="text-right">Tồn kho</th>
                                    <th>Bảo hành</th>
                                    <th className="text-center">Đang kinh doanh</th>
                                    <th>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr
                                        key={p._id || p.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleRowClick(p)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRowClick(p)}
                                        className="cursor-pointer hover:bg-base-200/60 transition-colors"
                                    >
                                        <td className="font-medium">{p.sku}</td>
                                        <td>{p.name}</td>
                                        <td>{p.brand || '—'}</td>
                                        <td>{p.capacity || '—'}</td>
                                        <td className="text-right">{formatVND(p.costPrice)}</td>
                                        <td className="text-right">{formatVND(p.price)}</td>
                                        <td className="text-right">{p.quantity ?? '—'}</td>
                                        <td>{p.warrantyText || (p.warrantyMonths != null ? `${p.warrantyMonths} tháng` : '—')}</td>
                                        <td className="text-center">{p.isActive ? 'Có' : 'Không'}</td>
                                        <td className="max-w-[200px] truncate" title={p.notes || ''}>{p.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && products.length > 0 && pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 border-t border-base-200">
                        <p className="text-sm text-base-content/60">
                            Hiển thị {products.length} / {pagination.total} sản phẩm
                        </p>
                        <div className="join">
                            <button
                                className="join-item btn btn-sm"
                                disabled={pagination.page <= 1}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >
                                «
                            </button>
                            <button className="join-item btn btn-sm">Trang {pagination.page} / {pagination.totalPages}</button>
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

            {/* Modal chi tiết sản phẩm */}
            {showDetailModal && selectedProduct && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="product-detail-title">
                    <div className="modal-box max-w-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 id="product-detail-title" className="font-bold text-lg">
                                Chi tiết sản phẩm
                            </h3>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-circle"
                                onClick={closeDetailModal}
                                aria-label="Đóng"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <span className="text-base-content/60">Loại hàng</span>
                                <span>{selectedProduct.category || '—'}</span>
                                <span className="text-base-content/60">Thương hiệu</span>
                                <span>{selectedProduct.brand || '—'}</span>
                                <span className="text-base-content/60">Mã hàng</span>
                                <span className="font-medium">{selectedProduct.sku}</span>
                                <span className="text-base-content/60">Mã vạch</span>
                                <span>{selectedProduct.barcode || '—'}</span>
                                <span className="text-base-content/60">Tên hàng</span>
                                <span className="col-span-1 font-medium">{selectedProduct.name}</span>
                                <span className="text-base-content/60">Dung lượng (Ah)</span>
                                <span>{selectedProduct.capacity || '—'}</span>
                                <span className="text-base-content/60">Đơn giá nhập</span>
                                <span>{formatVND(selectedProduct.costPrice)}</span>
                                <span className="text-base-content/60">Đơn giá bán</span>
                                <span>{formatVND(selectedProduct.price)}</span>
                                <span className="text-base-content/60">Tồn kho</span>
                                <span>{selectedProduct.quantity ?? '—'}</span>
                                <span className="text-base-content/60">Bảo hành</span>
                                <span>
                                    {selectedProduct.warrantyText ||
                                        (selectedProduct.warrantyMonths != null ? `${selectedProduct.warrantyMonths} tháng` : '—')}
                                </span>
                                <span className="text-base-content/60">Đang kinh doanh</span>
                                <span>{selectedProduct.isActive ? 'Có' : 'Không'}</span>
                                {selectedProduct.image ? (
                                    <>
                                        <span className="text-base-content/60">Hình ảnh</span>
                                        <span className="break-all">{selectedProduct.image}</span>
                                    </>
                                ) : null}
                            </div>
                            {selectedProduct.notes ? (
                                <div>
                                    <span className="text-base-content/60 block mb-1">Ghi chú</span>
                                    <p className="bg-base-200/50 rounded-lg p-3">{selectedProduct.notes}</p>
                                </div>
                            ) : null}

                            {/* In mã vạch */}
                            <div className="border-t border-base-200 pt-4 mt-4">

                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm gap-2"
                                    onClick={openBarcodeModal}
                                >
                                    <Printer className="w-4 h-4" />
                                    In tem mã
                                </button>
                            </div>
                        </div>
                        <div className="modal-action mt-6">
                            <button type="button" className="btn btn-ghost" onClick={closeDetailModal}>
                                Đóng
                            </button>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-error btn-outline gap-2"
                                    onClick={handleDeleteClick}
                                    aria-label="Xóa sản phẩm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Xóa sản phẩm
                                </button>
                                <button type="button" className="btn btn-primary gap-2" onClick={openEditModal}>
                                    <Pencil className="w-4 h-4" />
                                    Chỉnh sửa sản phẩm
                                </button>
                            </div>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={closeDetailModal}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal chọn loại giấy in tem mã */}
            {showBarcodeModal && selectedProduct && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="barcode-modal-title">
                    <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 id="barcode-modal-title" className="font-bold text-lg">Chọn loại giấy in tem mã</h3>
                            <button type="button" className="btn btn-ghost btn-sm btn-circle" onClick={() => setShowBarcodeModal(false)} aria-label="Đóng">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Cột trái: Thiết lập in */}
                            <div className="md:col-span-1 space-y-4">
                                <div>
                                    <label className="label"><span className="label-text font-semibold">Số lượng in</span></label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={5000}
                                        className="input input-bordered w-full"
                                        value={barcodePrintQty}
                                        onChange={(e) => setBarcodePrintQty(Math.min(5000, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Mã hàng</span></label>
                                    <input type="text" className="input input-bordered w-full bg-base-200" value={selectedProduct.sku || ''} readOnly />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="label cursor-pointer gap-2">
                                        <input type="checkbox" className="checkbox checkbox-sm" checked={barcodeShowPrice} onChange={(e) => setBarcodeShowPrice(e.target.checked)} />
                                        <span className="label-text">Giá kèm VND</span>
                                    </label>
                                    <label className="label cursor-pointer gap-2">
                                        <input type="checkbox" className="checkbox checkbox-sm" checked={barcodeShowStoreName} onChange={(e) => setBarcodeShowStoreName(e.target.checked)} />
                                        <span className="label-text">In tên cửa hàng</span>
                                    </label>
                                </div>
                                <button type="button" className="btn btn-ghost btn-sm gap-2 w-full" onClick={handleExportBarcodeExcel}>
                                    <FileSpreadsheet className="w-4 h-4" />
                                    Xuất file Excel
                                </button>
                                <div className="text-xs text-base-content/60 bg-base-200/50 rounded-lg p-3 space-y-1">
                                    <p className="font-semibold">Lưu ý:</p>
                                    <p>Nếu mã vạch in không đầy đủ, hãy dùng mẫu giấy lớn hơn hoặc rút ngắn mã hàng.</p>
                                    <p>Hỗ trợ in tối đa 5000 tem/lần, không chứa ký tự đặc biệt hoặc chữ có dấu.</p>
                                </div>
                            </div>
                            {/* Cột phải: Mẫu giấy */}
                            <div className="md:col-span-2">
                                <p className="text-sm font-semibold mb-3">Chọn mẫu giấy in nhãn</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { id: '1', name: 'Mẫu giấy cuộn 3 nhãn (104×22mm)', width: '104' },
                                        { id: '2', name: 'Mẫu giấy cuộn 2 nhãn (72×22mm)', width: '72' },
                                        { id: '3', name: 'Mẫu giấy cuộn 2 nhãn (74×22mm)', width: '74' },
                                        { id: '4', name: 'Mẫu giấy cuộn 1 nhãn (50×30mm)', width: '50' },
                                        { id: '5', name: 'Mẫu giấy 12 nhãn Tomy 103 (202×162mm)', width: '202' },
                                        { id: '6', name: 'Mẫu giấy 65 nhãn A4 - Tomy 145', width: 'A4' },
                                        { id: '7', name: 'Mẫu tem hàng trang sức (75×10mm)', width: '75' },
                                    ].map((tpl) => (
                                        <div key={tpl.id} className="border border-base-300 rounded-lg p-4 flex flex-col">
                                            <p className="text-sm font-medium mb-2 flex-1">{tpl.name}</p>
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm gap-1"
                                                onClick={() => handlePrintBarcode(tpl)}
                                            >
                                                <Printer className="w-4 h-4" />
                                                Xem bản in
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowBarcodeModal(false)}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal chỉnh sửa sản phẩm */}
            {showEditModal && selectedProduct && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="product-edit-title">
                    <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 id="product-edit-title" className="font-bold text-lg mb-4">
                            Chỉnh sửa sản phẩm
                        </h3>
                        <form onSubmit={handleUpdateProduct} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Loại hàng</span></label>
                                    <div className="flex gap-2">
                                        <select
                                            className="select select-bordered flex-1"
                                            value={editFormData.category}
                                            onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                                        >
                                            <option value="">— Chọn —</option>
                                            {optionCategories.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => openAddCategoryModal('edit')} title="Thêm loại hàng">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Thương hiệu</span></label>
                                    <div className="flex gap-2">
                                        <select
                                            className="select select-bordered flex-1"
                                            value={editFormData.brand}
                                            onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                                        >
                                            <option value="">— Chọn —</option>
                                            {optionBrands.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => openAddBrandModal('edit')} title="Thêm thương hiệu">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text font-semibold">Mã hàng <span className="text-error">*</span></span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editFormData.sku}
                                        onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Mã vạch</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editFormData.barcode}
                                        onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label"><span className="label-text font-semibold">Tên hàng <span className="text-error">*</span></span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Dung lượng (Ah)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={editFormData.capacity}
                                        onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Tồn kho</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={editFormData.quantity}
                                        onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Đơn giá nhập (VNĐ)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={editFormData.costPrice || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Đơn giá bán (VNĐ)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={editFormData.price || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Bảo hành (tháng)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        placeholder="VD: 12"
                                        value={editFormData.warrantyMonths ?? ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, warrantyMonths: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Bảo hành (ghi chú)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="VD: 12 tháng"
                                        value={editFormData.warrantyText}
                                        onChange={(e) => setEditFormData({ ...editFormData, warrantyText: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label"><span className="label-text">Hình ảnh (URL)</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={editFormData.image}
                                    onChange={(e) => setEditFormData({ ...editFormData, image: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label cursor-pointer gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={editFormData.isActive}
                                        onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                    />
                                    <span className="label-text">Đang kinh doanh</span>
                                </label>
                            </div>
                            <div>
                                <label className="label"><span className="label-text">Ghi chú</span></label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={editFormData.notes}
                                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                />
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={closeEditModal}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm" />
                                            Đang cập nhật...
                                        </>
                                    ) : (
                                        'Cập nhật'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={closeEditModal}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal thêm sản phẩm */}
            {showCreateModal && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="product-create-title">
                    <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 id="product-create-title" className="font-bold text-lg mb-4">
                            Thêm sản phẩm
                        </h3>
                        <form onSubmit={handleCreateProduct} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Loại hàng</span></label>
                                    <div className="flex gap-2">
                                        <select
                                            className="select select-bordered flex-1"
                                            value={createFormData.category}
                                            onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                                        >
                                            <option value="">— Chọn —</option>
                                            {optionCategories.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => openAddCategoryModal('create')} title="Thêm loại hàng">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Thương hiệu</span></label>
                                    <div className="flex gap-2">
                                        <select
                                            className="select select-bordered flex-1"
                                            value={createFormData.brand}
                                            onChange={(e) => setCreateFormData({ ...createFormData, brand: e.target.value })}
                                        >
                                            <option value="">— Chọn —</option>
                                            {optionBrands.map((v) => (
                                                <option key={v} value={v}>{v}</option>
                                            ))}
                                        </select>
                                        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={() => openAddBrandModal('create')} title="Thêm thương hiệu">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text font-semibold">Mã hàng <span className="text-error">*</span></span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createFormData.sku}
                                        onChange={(e) => setCreateFormData({ ...createFormData, sku: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Mã vạch</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createFormData.barcode}
                                        onChange={(e) => setCreateFormData({ ...createFormData, barcode: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label"><span className="label-text font-semibold">Tên hàng <span className="text-error">*</span></span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={createFormData.name}
                                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Dung lượng (Ah)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={createFormData.capacity}
                                        onChange={(e) => setCreateFormData({ ...createFormData, capacity: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Tồn kho</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={createFormData.quantity}
                                        onChange={(e) => setCreateFormData({ ...createFormData, quantity: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Đơn giá nhập (VNĐ)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={createFormData.costPrice || ''}
                                        onChange={(e) => setCreateFormData({ ...createFormData, costPrice: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Đơn giá bán (VNĐ)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        value={createFormData.price || ''}
                                        onChange={(e) => setCreateFormData({ ...createFormData, price: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label"><span className="label-text">Bảo hành (tháng)</span></label>
                                    <input
                                        type="number"
                                        min={0}
                                        className="input input-bordered w-full"
                                        placeholder="VD: 12"
                                        value={createFormData.warrantyMonths ?? ''}
                                        onChange={(e) => setCreateFormData({ ...createFormData, warrantyMonths: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="label"><span className="label-text">Bảo hành (ghi chú)</span></label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="VD: 12 tháng"
                                        value={createFormData.warrantyText}
                                        onChange={(e) => setCreateFormData({ ...createFormData, warrantyText: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label"><span className="label-text">Hình ảnh (URL)</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    value={createFormData.image}
                                    onChange={(e) => setCreateFormData({ ...createFormData, image: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="label cursor-pointer gap-2">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={createFormData.isActive}
                                        onChange={(e) => setCreateFormData({ ...createFormData, isActive: e.target.checked })}
                                    />
                                    <span className="label-text">Đang kinh doanh</span>
                                </label>
                            </div>
                            <div>
                                <label className="label"><span className="label-text">Ghi chú</span></label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    rows={3}
                                    value={createFormData.notes}
                                    onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                                />
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={closeCreateModal}>
                                    Hủy
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <span className="loading loading-spinner loading-sm" />
                                            Đang thêm...
                                        </>
                                    ) : (
                                        'Thêm sản phẩm'
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

            {/* Modal thêm loại hàng */}
            {showAddCategoryModal && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="add-category-title">
                    <div className="modal-box max-w-sm">
                        <h3 id="add-category-title" className="font-bold text-lg mb-3">Thêm loại hàng</h3>
                        <form onSubmit={handleAddCategory} className="space-y-3">
                            <div>
                                <label className="label"><span className="label-text">Tên loại hàng</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="VD: Ắc quy"
                                    value={newCategoryInput}
                                    onChange={(e) => setNewCategoryInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddCategoryModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Thêm</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowAddCategoryModal(false)}>Đóng</button>
                    </form>
                </dialog>
            )}

            {/* Modal thêm thương hiệu */}
            {showAddBrandModal && (
                <dialog className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="add-brand-title">
                    <div className="modal-box max-w-sm">
                        <h3 id="add-brand-title" className="font-bold text-lg mb-3">Thêm thương hiệu</h3>
                        <form onSubmit={handleAddBrand} className="space-y-3">
                            <div>
                                <label className="label"><span className="label-text">Tên thương hiệu</span></label>
                                <input
                                    type="text"
                                    className="input input-bordered w-full"
                                    placeholder="VD: ATLASBX"
                                    value={newBrandInput}
                                    onChange={(e) => setNewBrandInput(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddBrandModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Thêm</button>
                            </div>
                        </form>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button type="button" onClick={() => setShowAddBrandModal(false)}>Đóng</button>
                    </form>
                </dialog>
            )}

            <ConfirmationModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, onConfirm: null })}
                onConfirm={confirmDeleteModal.onConfirm}
                title="Xóa sản phẩm"
                message="Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
                confirmText="Xóa"
                cancelText="Hủy"
                variant="danger"
            />
        </div>
    );
};

export default ProductListTab;
