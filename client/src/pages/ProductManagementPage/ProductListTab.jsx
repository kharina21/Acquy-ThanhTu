import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Package, Upload, Search, Pencil, X, Trash2, Plus, Printer, FileSpreadsheet, Barcode, FolderDown, ImageIcon } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { getProducts, createProduct, updateProduct, deleteProduct, importProductsFromExcel, generateSampleExcelBlob, uploadProductImage } from '@/services/productService';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/categoryService';
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/services/brandService';
import CategoryBrandSelect from '@/components/common/CategoryBrandSelect';
import CategoryModal from '@/pages/CategoryManagementPage/CategoryModal';
import BrandModal from '@/components/common/BrandModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useBranchStore } from '@/stores/useBranchStore';
import { toast } from 'sonner';
import { getUsageDevices, createUsageDevice, updateUsageDevice, deleteUsageDevice } from '@/services/usageDeviceService';
import UsageDeviceModal from '@/components/common/UsageDeviceModal';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const emptyProductForm = () => ({
    category: null,
    brand: null,
    sku: '',
    barcode: '',
    name: '',
    usageDevice: null,
    capacity: '',
    costPrice: 0,
    price: 0,
    quantity: 0,
    images: [],
    isActive: true,
    warrantyText: '',
    notes: '',
});

const ProductListTab = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
    const [selectedRowIds, setSelectedRowIds] = useState([]);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState(emptyProductForm());
    const [submitting, setSubmitting] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState({ isOpen: false, onConfirm: null });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState(emptyProductForm());
    const [categories, setCategories] = useState([]);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [brands, setBrands] = useState([]);
    const [usageDevices, setUsageDevices] = useState([]);
    const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);
    const [brandRefreshKey, setBrandRefreshKey] = useState(0);
    const [usageDeviceRefreshKey, setUsageDeviceRefreshKey] = useState(0);
    const [showUsageDeviceModal, setShowUsageDeviceModal] = useState(false);
    const [editingUsageDevice, setEditingUsageDevice] = useState(null);
    const [showBarcodeModal, setShowBarcodeModal] = useState(false);
    const [barcodePrintQty, setBarcodePrintQty] = useState(1);
    const [barcodeShowPrice, setBarcodeShowPrice] = useState(true);
    const [barcodeShowStoreName, setBarcodeShowStoreName] = useState(true);
    const [imageUploading, setImageUploading] = useState(false);
    const [detailImageIndex, setDetailImageIndex] = useState(0);
    const [editImageIndex, setEditImageIndex] = useState(0);
    const [createImageIndex, setCreateImageIndex] = useState(0);

    // Lọc theo tên thương hiệu / tên thiết bị sử dụng (để hỗ trợ cả dữ liệu cũ lẫn mới)
    const [filterBrand, setFilterBrand] = useState('');
    const [filterUsageDevice, setFilterUsageDevice] = useState('');
    // 0 = không lọc, >0 = giá trị VNĐ
    const [filterPriceMin, setFilterPriceMin] = useState(0);
    const [filterPriceMax, setFilterPriceMax] = useState(0);

    const currentLocationId = useBranchStore((s) => s.currentLocationId);

    const fetchProducts = async () => {
        setLoading(true);
        const res = await getProducts({
            page: pagination.page,
            limit: pagination.limit,
            search,
            locationId: currentLocationId || undefined,
            brand: filterBrand || undefined,
            usageDevice: filterUsageDevice || undefined,
            priceMin: filterPriceMin || undefined,
            priceMax: filterPriceMax || undefined,
        });
        if (res.success) {
            setProducts(res.data.products);
            setPagination(res.data.pagination);
        }
        setLoading(false);
        setSelectedRowIds([]);
    };

    useEffect(() => {
        if (selectedProduct) setDetailImageIndex(0);
    }, [selectedProduct?._id]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getProducts({
            page: pagination.page,
            limit: pagination.limit,
            search,
            locationId: currentLocationId || undefined,
            brand: filterBrand || undefined,
            usageDevice: filterUsageDevice || undefined,
            priceMin: filterPriceMin || undefined,
            priceMax: filterPriceMax || undefined,
        })
            .then((res) => {
                if (!cancelled && res.success) {
                    setProducts(res.data.products);
                    setPagination(res.data.pagination);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [pagination.page, search, currentLocationId, filterBrand, filterUsageDevice, filterPriceMin, filterPriceMax]);

    const toggleSelectRow = (id) => {
        setSelectedRowIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSelectAll = () => {
        if (products.length === 0) return;
        if (selectedRowIds.length === products.length) {
            setSelectedRowIds([]);
        } else {
            setSelectedRowIds(products.map((p) => p._id || p.id).filter(Boolean));
        }
    };

    // Sau khi đã lọc ở backend, danh sách hiển thị chính là mảng products
    const filteredProducts = products;

    const fetchCategories = async () => {
        try {
            const res = await getCategories({ isActive: true });
            if (res.success && res.data) {
                setCategories(res.data.categories || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchBrands = async () => {
        try {
            const res = await getBrands({ isActive: true });
            if (res.success && res.data) {
                setBrands(res.data.brands || []);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    };

    const fetchUsageDevices = async () => {
        try {
            const res = await getUsageDevices();
            if (res.success && res.data) {
                setUsageDevices(res.data.usageDevices || []);
            }
        } catch (error) {
            console.error('Error fetching usage devices:', error);
        }
    };

    const _CATEGORIES_COUNT = categories.length;
    const _BRANDS_COUNT = brands.length;

    useEffect(() => {
        fetchCategories();
        fetchBrands();
        fetchUsageDevices();
    }, []);

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
            console.error('handleDownloadSample error:', err);
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
            setImporting(true);
            try {
                const result = await importProductsFromExcel(file, currentLocationId);
                if (result.success) {
                    toast.success(result.message || 'Import thành công');
                    fetchProducts();
                    fetchCategories(); // Refresh categories sau khi import
                } else {
                    toast.error(result.message || 'Import thất bại');
                }
            } catch (err) {
                console.error('handleImportClick error:', err);
                toast.error(err.message || 'Import thất bại. Kiểm tra định dạng file.');
            } finally {
                setImporting(false);
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
        // Lấy category name từ product.category (populate) hoặc fallback (legacy string)
        setEditFormData({
            category: selectedProduct.category?._id || selectedProduct.category || null,
            brand: selectedProduct.brand?._id || selectedProduct.brand || null,
            sku: selectedProduct.sku ?? '',
            barcode: selectedProduct.barcode ?? '',
            name: selectedProduct.name ?? '',
            usageDevice: selectedProduct.usageDevice?._id || selectedProduct.usageDevice || null,
            capacity: selectedProduct.capacity ?? '',
            costPrice: selectedProduct.costPrice ?? 0,
            price: selectedProduct.price ?? 0,
            quantity: selectedProduct.stockAtLocation ?? selectedProduct.totalStock ?? 0,
            images: selectedProduct.images?.length ? selectedProduct.images : selectedProduct.image ? [selectedProduct.image] : [],
            isActive: selectedProduct.isActive ?? true,
            warrantyText: selectedProduct.warrantyText ?? '',
            notes: selectedProduct.notes ?? '',
        });
        setShowDetailModal(false);
        setEditImageIndex(0);
        setShowEditModal(true);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        if (!selectedProduct?._id) return;
        setSubmitting(true);
        try {
            const payload = {
                ...editFormData,
                category: editFormData.category || null,
                brand: editFormData.brand || null,
                costPrice: Number(editFormData.costPrice) || 0,
                price: Number(editFormData.price) || 0,
                quantity: Number(editFormData.quantity) || 0,
                images: Array.isArray(editFormData.images) ? editFormData.images : [],
            };
            if (currentLocationId) payload.locationId = currentLocationId;
            await updateProduct(selectedProduct._id, payload);
            toast.success('Cập nhật sản phẩm thành công');
            setShowEditModal(false);
            setSelectedProduct(null);
            setEditFormData(emptyProductForm());
            fetchProducts();
            fetchCategories(); // Refresh categories để hiển thị category mới tạo
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

    /**
     * In tem mã vạch 35×22mm (2 cell/hàng).
     * - Khổ giấy: 70×22mm = 1 hàng, chia 2 cell (mỗi cell 35×22mm).
     * - Chẵn (2,4,6...): in cả 2 cell mỗi hàng. Lẻ: hàng cuối chỉ cell trái.
     */
    const handlePrintBarcode = () => {
        if (!selectedProduct) return;
        const barcodeValue = (selectedProduct.barcode || selectedProduct.sku || '').toString().replace(/[^\w\s-]/g, '');
        if (!barcodeValue) {
            toast.error('Sản phẩm chưa có mã vạch hoặc mã hàng');
            return;
        }
        const qty = Math.min(5000, Math.max(1, parseInt(barcodePrintQty, 10) || 1));
        const w = 35;
        const h = 22;
        const barcodeHeight = 25;
        const padding = 0;
        const fontSize = 7;
        const nameFontSize = 7;
        const maxChars = 14;
        const fullName = (selectedProduct.name || selectedProduct.sku || '').toString();
        const showBarcodeText = fullName.trim().toUpperCase() !== barcodeValue.trim().toUpperCase();
        const barcodeCanvas = document.createElement('canvas');
        try {
            JsBarcode(barcodeCanvas, barcodeValue, {
                format: 'CODE128',
                width: 1.0,
                height: barcodeHeight,
                displayValue: false,
                margin: 4,
            });
        } catch (error) {
            console.error('JsBarcode error:', error);
            toast.error('Không tạo được mã vạch. Kiểm tra mã không chứa ký tự đặc biệt.');
            return;
        }
        const priceStr = barcodeShowPrice && selectedProduct.price != null ? formatVND(selectedProduct.price) : '';
        const name = fullName.length > maxChars ? fullName.slice(0, maxChars) + '…' : fullName;
        const pxPerMm = 12;
        const pxW = Math.round(w * pxPerMm);
        const pxH = Math.round(h * pxPerMm);
        const labelCanvas = document.createElement('canvas');
        labelCanvas.width = pxW;
        labelCanvas.height = pxH;
        const ctx = labelCanvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, pxW, pxH);
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const fontPx = Math.max(6, fontSize * pxPerMm * 0.35);
        const nameFontPx = Math.max(6, nameFontSize * pxPerMm * 0.35);
        const pad = padding * pxPerMm;
        const maxBcW = pxW;
        const targetBcH = pxH * 0.58;
        const scale = Math.min(maxBcW / barcodeCanvas.width, targetBcH / barcodeCanvas.height);
        const bcW = barcodeCanvas.width * scale;
        const bcH = barcodeCanvas.height * scale;
        const nameGap = nameFontPx * 0.92;
        const codeGap = fontPx * 0.6;
        const barcodeMarginBottom = 0;
        const priceMarginTop = 8;
        const priceH = priceStr ? fontPx * 1.15 : 0;
        const totalH = pad + nameGap + bcH + barcodeMarginBottom + codeGap + priceMarginTop + priceH + pad;
        const offsetY = Math.max(0, (pxH - totalH) / 2);
        let y = offsetY + pad;
        ctx.font = `${nameFontPx}px Arial`;
        ctx.fillText(name, pxW / 2, y);
        y += nameGap;
        ctx.drawImage(barcodeCanvas, (pxW - bcW) / 2, y, bcW, bcH);
        y += bcH + barcodeMarginBottom;
        ctx.font = `${Math.max(6, fontPx * 0.85)}px Arial`;
        ctx.fillText(barcodeValue, pxW / 2, y);
        y += codeGap + priceMarginTop;
        if (priceStr) {
            ctx.font = `${Math.max(8, fontPx * 1.1)}px Arial`;
            ctx.fillText(priceStr, pxW / 2, y);
        }
        const labelDataUrl = labelCanvas.toDataURL('image/png');

        // Khổ giấy 70×22mm = 2 cell (35×22mm/cell). Chẵn: cả 2 cell; lẻ: chỉ cell trái.
        const sheetW = w * 2; // 70mm
        const sheetH = h; // 22mm
        const cellW = w; // 35mm
        const cellH = h; // 22mm
        const rows = Math.ceil(qty / 2);
        const bodyStyle = rows === 1 ? `style="height:${sheetH}mm;max-height:${sheetH}mm;overflow:hidden;margin:0;padding:0;"` : `style="padding-top:42px;"`;
        const imgStyle = `width:${cellW}mm;height:${cellH}mm;min-width:${cellW}mm;min-height:${cellH}mm;max-width:${cellW}mm;max-height:${cellH}mm;display:block;margin:0;padding:0;object-fit:contain;object-position:center;box-sizing:border-box;flex-shrink:0;image-rendering:crisp-edges;-webkit-print-color-adjust:exact;`;
        const imgTag = `<img src="${labelDataUrl}" alt="tem" style="${imgStyle}" />`;
        const emptyCell = `<div style="width:${cellW}mm;height:${cellH}mm;flex-shrink:0;background:#fff;"></div>`;
        const rowHtml = [];
        for (let row = 0; row < rows; row++) {
            const count = Math.min(2, qty - row * 2);
            const rightCell = count >= 2 ? imgTag : emptyCell;
            const isLast = row === rows - 1;
            const pageBreakBefore = row === 0 ? 'page-break-before:avoid;' : '';
            rowHtml.push(
                `<div style="display:flex;width:${sheetW}mm;height:${sheetH}mm;margin:0;padding:0;${pageBreakBefore}page-break-after:${isLast ? 'avoid' : 'always'};">${imgTag}${rightCell}</div>`,
            );
        }
        const bodyHtml = rowHtml.join('');
        const singleRowFix =
            rows === 1 ? `html,body{height:${sheetH}mm !important;max-height:${sheetH}mm !important;overflow:hidden !important;}div{page-break-after:avoid !important;}` : '';
        const pageStyle = `@page{size:${sheetW}mm ${sheetH}mm landscape;margin:0;}@media print{html,body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}${singleRowFix}img{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}`;

        const hintStyle = `.print-hint{display:block;}@media print{.print-hint{display:none !important;}body{padding:0 !important;margin:0 !important;}}`;
        const printBody = `<div class="print-hint" style="position:fixed;top:0;left:0;right:0;background:#fef3c7;color:#92400e;padding:8px 12px;font-size:13px;text-align:center;z-index:9999;border-bottom:1px solid #fcd34d;">⚠️ Chọn <strong>Landscape</strong> và <strong>Actual size</strong> trong hộp thoại in.</div>${bodyHtml}`;
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
        document.body.appendChild(iframe);
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
          <!DOCTYPE html><html><head><title>In tem mã - ${selectedProduct.sku}</title>
          <meta charset="utf-8">
          <style>
            *{margin:0;padding:0;box-sizing:border-box;}
            html,body{margin:0;padding:0;}
            img{display:block;}
            img:not(:last-child){page-break-after:always;}
            img:last-child{page-break-after:avoid;}
            ${hintStyle}
            @media print{${pageStyle}}
          </style></head>
          <body ${bodyStyle}>${printBody}</body></html>
        `);
        doc.close();
        iframe.contentWindow.addEventListener('beforeprint', function onBeforePrint() {
            iframe.contentDocument.body.innerHTML = bodyHtml;
            iframe.contentDocument.body.style.cssText = 'margin:0;padding:0;';
        });
        iframe.contentWindow.addEventListener('afterprint', () => {
            document.body.removeChild(iframe);
        });
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        // Fallback: remove iframe nếu afterprint không fire (một số browser)
        setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe);
        }, 1000);
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
        setCreateImageIndex(0);
        setShowCreateModal(true);
    };

    const handleCreateCategory = () => {
        setEditingCategory(null);
        setShowCategoryModal(true);
    };

    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setShowCategoryModal(true);
    };

    const handleSaveCategory = async (formData) => {
        try {
            if (editingCategory) {
                await updateCategory(editingCategory._id, formData);
                toast.success('Cập nhật loại hàng thành công');
            } else {
                const res = await createCategory(formData);
                if (res.success) {
                    toast.success('Tạo loại hàng thành công');
                    // Tự động chọn category vừa tạo
                    if (showCreateModal) {
                        setCreateFormData((prev) => ({ ...prev, category: res.data.category._id }));
                    } else if (showEditModal) {
                        setEditFormData((prev) => ({ ...prev, category: res.data.category._id }));
                    }
                }
            }
            setShowCategoryModal(false);
            fetchCategories();
            setCategoryRefreshKey((k) => k + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu loại hàng');
        }
    };

    const handleDeleteCategory = async () => {
        if (!editingCategory?._id) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa loại hàng này?')) return;
        try {
            const res = await deleteCategory(editingCategory._id);
            if (res.success) {
                toast.success('Xóa loại hàng thành công');
                const deletedCategoryId = String(editingCategory._id);
                // Nếu form đang chọn category này thì reset về null
                setCreateFormData((prev) => (prev.category && String(prev.category) === deletedCategoryId ? { ...prev, category: null } : prev));
                setEditFormData((prev) => (prev.category && String(prev.category) === deletedCategoryId ? { ...prev, category: null } : prev));
                setShowCategoryModal(false);
                setEditingCategory(null);
                fetchCategories();
                setCategoryRefreshKey((k) => k + 1);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa loại hàng');
        }
    };

    const handleCreateBrand = () => {
        setEditingBrand(null);
        setShowBrandModal(true);
    };

    const handleEditBrand = (brand) => {
        setEditingBrand(brand);
        setShowBrandModal(true);
    };

    const handleSaveBrand = async (formData) => {
        try {
            if (editingBrand) {
                await updateBrand(editingBrand._id, formData);
                toast.success('Cập nhật thương hiệu thành công');
            } else {
                const res = await createBrand(formData);
                if (res.success) {
                    toast.success('Tạo thương hiệu thành công');
                    // Tự động chọn brand vừa tạo
                    if (showCreateModal) {
                        setCreateFormData((prev) => ({ ...prev, brand: res.data.brand._id }));
                    } else if (showEditModal) {
                        setEditFormData((prev) => ({ ...prev, brand: res.data.brand._id }));
                    }
                }
            }
            setShowBrandModal(false);
            fetchBrands();
            setBrandRefreshKey((k) => k + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu thương hiệu');
        }
    };

    const handleDeleteBrand = async () => {
        if (!editingBrand?._id) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa thương hiệu này?')) return;
        try {
            const res = await deleteBrand(editingBrand._id);
            if (res.success) {
                toast.success('Xóa thương hiệu thành công');
                const deletedBrandId = String(editingBrand._id);
                // Nếu form đang chọn brand này thì reset về null
                setCreateFormData((prev) => (prev.brand && String(prev.brand) === deletedBrandId ? { ...prev, brand: null } : prev));
                setEditFormData((prev) => (prev.brand && String(prev.brand) === deletedBrandId ? { ...prev, brand: null } : prev));
                setShowBrandModal(false);
                setEditingBrand(null);
                fetchBrands();
                setBrandRefreshKey((k) => k + 1);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa thương hiệu');
        }
    };

    const handleCreateUsageDevice = () => {
        setEditingUsageDevice(null);
        setShowUsageDeviceModal(true);
    };

    const handleEditUsageDevice = (device) => {
        setEditingUsageDevice(device);
        setShowUsageDeviceModal(true);
    };

    const handleSaveUsageDevice = async (formData) => {
        try {
            if (editingUsageDevice) {
                await updateUsageDevice(editingUsageDevice._id, formData);
                toast.success('Cập nhật thiết bị sử dụng thành công');
                if (showCreateModal) {
                    setCreateFormData((prev) => ({ ...prev, usageDevice: editingUsageDevice._id }));
                } else if (showEditModal) {
                    setEditFormData((prev) => ({ ...prev, usageDevice: editingUsageDevice._id }));
                }
            } else {
                const res = await createUsageDevice(formData);
                if (res.success) {
                    toast.success('Tạo thiết bị sử dụng thành công');
                    if (showCreateModal) {
                        setCreateFormData((prev) => ({ ...prev, usageDevice: res.data.usageDevice._id }));
                    } else if (showEditModal) {
                        setEditFormData((prev) => ({ ...prev, usageDevice: res.data.usageDevice._id }));
                    }
                }
            }
            setShowUsageDeviceModal(false);
            setEditingUsageDevice(null);
            fetchUsageDevices();
            setUsageDeviceRefreshKey((k) => k + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu thiết bị sử dụng');
        }
    };

    const handleDeleteUsageDevice = async () => {
        if (!editingUsageDevice?._id) return;
        if (!window.confirm('Bạn có chắc chắn muốn xóa thiết bị sử dụng này?')) return;
        try {
            await deleteUsageDevice(editingUsageDevice._id);
            toast.success('Xóa thiết bị sử dụng thành công');
            const deletedId = String(editingUsageDevice._id);
            setCreateFormData((prev) => (prev.usageDevice && String(prev.usageDevice) === deletedId ? { ...prev, usageDevice: null } : prev));
            setEditFormData((prev) => (prev.usageDevice && String(prev.usageDevice) === deletedId ? { ...prev, usageDevice: null } : prev));
            setShowUsageDeviceModal(false);
            setEditingUsageDevice(null);
            fetchUsageDevices();
            setUsageDeviceRefreshKey((k) => k + 1);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa thiết bị sử dụng');
        }
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
                category: createFormData.category || null,
                brand: createFormData.brand || null,
                costPrice: Number(createFormData.costPrice) || 0,
                price: Number(createFormData.price) || 0,
                quantity: Number(createFormData.quantity) || 0,
                images: Array.isArray(createFormData.images) ? createFormData.images : [],
            };
            delete payload.category;
            if (currentLocationId) payload.locationId = currentLocationId;
            const res = await createProduct(payload);
            toast.success('Thêm sản phẩm thành công.');
            closeCreateModal();
            fetchProducts();
            fetchCategories();
            fetchBrands();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Thêm sản phẩm thất bại';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = () => {
        if (!selectedProduct) return;
        const qty = selectedProduct.totalStock ?? 0;
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

    const handleBulkDelete = async () => {
        if (selectedRowIds.length === 0) return;
        if (!window.confirm(`Bạn có chắc muốn xóa ${selectedRowIds.length} sản phẩm đã chọn?`)) return;
        setBulkProcessing(true);
        try {
            const productMap = Object.fromEntries(products.map((p) => [(p._id || p.id).toString(), p]));
            const deletableIds = selectedRowIds.filter((id) => {
                const p = productMap[id];
                const qty = p?.totalStock ?? 0;
                if (qty > 0) {
                    toast.error(`Không thể xóa ${p?.sku || p?.name || 'sản phẩm'} vì tồn kho > 0`);
                    return false;
                }
                return true;
            });
            if (deletableIds.length === 0) {
                setBulkProcessing(false);
                return;
            }
            const results = await Promise.allSettled(deletableIds.map((id) => deleteProduct(id)));
            const successCount = results.filter((r) => r.status === 'fulfilled').length;
            if (successCount > 0) {
                toast.success(`Đã xóa ${successCount} sản phẩm`);
                fetchProducts();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Xóa sản phẩm hàng loạt thất bại');
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkSetActive = async (isActive) => {
        if (selectedRowIds.length === 0) return;
        setBulkProcessing(true);
        try {
            const productMap = Object.fromEntries(products.map((p) => [(p._id || p.id).toString(), p]));
            const targets = selectedRowIds.map((id) => productMap[id]).filter(Boolean);

            const results = await Promise.allSettled(
                targets.map((p) =>
                    updateProduct(p._id || p.id, {
                        sku: p.sku,
                        barcode: p.barcode,
                        name: p.name,
                        category: p.category?._id || p.category || null,
                        brand: p.brand?._id || p.brand || null,
                        usageDevice: p.usageDevice?._id || p.usageDevice || null,
                        capacity: p.capacity,
                        costPrice: p.costPrice,
                        price: p.price,
                        images: p.images || (p.image ? [p.image] : []),
                        isActive,
                    }),
                ),
            );
            const successCount = results.filter((r) => r.status === 'fulfilled').length;
            if (successCount > 0) {
                toast.success(`${isActive ? 'Đã bật' : 'Đã tắt'} đang kinh doanh cho ${successCount} sản phẩm`);
                fetchProducts();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Cập nhật trạng thái hàng loạt thất bại');
        } finally {
            setBulkProcessing(false);
        }
    };

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
                <div className='flex gap-2 flex-1 min-w-[200px]'>
                    <div className='relative flex-1 max-w-md'>
                        <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10' />
                        <input
                            type='text'
                            placeholder='Tìm theo tên, mã hàng, thương hiệu...'
                            className='input input-bordered w-full pl-10'
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearch(value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        />
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {products.length > 0 && (
                        <div className='flex items-center gap-2 mr-2'>
                            <button
                                type='button'
                                className='btn btn-outline btn-xs'
                                disabled={selectedRowIds.length === 0 || bulkProcessing}
                                onClick={handleBulkDelete}
                            >
                                Xóa đã chọn
                            </button>
                            <button
                                type='button'
                                className='btn btn-outline btn-xs'
                                disabled={selectedRowIds.length === 0 || bulkProcessing}
                                onClick={() => handleBulkSetActive(true)}
                            >
                                Đang kinh doanh
                            </button>
                            <button
                                type='button'
                                className='btn btn-outline btn-xs'
                                disabled={selectedRowIds.length === 0 || bulkProcessing}
                                onClick={() => handleBulkSetActive(false)}
                            >
                                Ngừng kinh doanh
                            </button>
                        </div>
                    )}
                    <button
                        type='button'
                        className='btn btn-primary btn-sm gap-2'
                        onClick={openCreateModal}
                    >
                        <Plus className='w-4 h-4' />
                        Thêm sản phẩm
                    </button>
                    <button
                        type='button'
                        className='btn btn-ghost btn-sm gap-2'
                        onClick={handleDownloadSample}
                    >
                        <Package className='w-4 h-4' />
                        Tải file mẫu
                    </button>
                    <button
                        type='button'
                        className='btn btn-primary btn-sm gap-2'
                        onClick={handleImportClick}
                        disabled={importing}
                    >
                        <FolderDown className='w-4 h-4' />
                        {importing ? 'Đang import...' : 'Import từ Excel'}
                    </button>
                </div>
            </div>

            <div className='flex gap-4'>
                {/* Sidebar bộ lọc */}
                <div className='w-72 shrink-0 bg-base-100 rounded-lg shadow p-4 space-y-4'>
                    <div>
                        <h3 className='text-sm font-semibold mb-2'>Thiết bị sử dụng</h3>
                        <select
                            className='select select-sm select-bordered w-full'
                            value={filterUsageDevice}
                            onChange={(e) => {
                                setFilterUsageDevice(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            <option value=''>Tất cả thiết bị</option>
                            {usageDevices.map((u) => (
                                <option
                                    key={u._id}
                                    value={u._id}
                                >
                                    {u.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <h3 className='text-sm font-semibold mb-2'>Thương hiệu</h3>
                        <select
                            className='select select-sm select-bordered w-full'
                            value={filterBrand}
                            onChange={(e) => {
                                setFilterBrand(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            <option value=''>Tất cả thương hiệu</option>
                            {brands.map((b) => (
                                <option
                                    key={b._id}
                                    value={b._id}
                                >
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <h3 className='text-sm font-semibold mb-2'>Giá bán</h3>
                        <div className='space-y-1'>
                            <input
                                type='range'
                                min={0}
                                max={20}
                                step={1}
                                className='range range-xs range-primary'
                                value={filterPriceMax ? filterPriceMax / 1_000_000 : 0}
                                onChange={(e) => {
                                    const million = Number(e.target.value) || 0;
                                    setFilterPriceMax(million * 1_000_000);
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            />
                            <div className='text-xs text-base-content/70'>{filterPriceMax > 0 ? `Giá bán ≤ ${formatVND(filterPriceMax)}` : 'Tất cả mức giá (0 - 20.000.000)'}</div>
                            <div className='flex items-center gap-2 mt-1'>
                                <input
                                    type='number'
                                    min={0}
                                    className='input input-xs input-bordered w-1/2'
                                    placeholder='Min'
                                    value={filterPriceMin || ''}
                                    onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setFilterPriceMin(val < 0 ? 0 : val);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                />
                                <span className='text-xs'>đến</span>
                                <input
                                    type='number'
                                    min={0}
                                    className='input input-xs input-bordered w-1/2'
                                    placeholder='Max'
                                    value={filterPriceMax || ''}
                                    onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        setFilterPriceMax(val < 0 ? 0 : val);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type='button'
                        className='btn btn-ghost btn-xs w-full'
                        onClick={() => {
                            setFilterBrand('');
                            setFilterUsageDevice('');
                            setFilterPriceMin(0);
                            setFilterPriceMax(0);
                            setPagination((p) => ({ ...p, page: 1 }));
                        }}
                    >
                        Xóa tất cả lọc
                    </button>
                </div>

                {/* Bảng danh sách */}
                <div className='flex-1 bg-base-100 rounded-lg shadow overflow-hidden'>
                    {loading ? (
                        <div className='flex justify-center items-center p-12'>
                            <span className='loading loading-spinner loading-lg text-primary' />
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className='p-12 text-center text-base-content/60'>
                            <Package className='w-12 h-12 mx-auto mb-3 opacity-50' />
                            <p>Không tìm thấy sản phẩm phù hợp bộ lọc hiện tại.</p>
                        </div>
                    ) : (
                        <div className='overflow-x-auto overflow-y-auto max-h-[700px]'>
                            <table className='table'>
                                <thead className='bg-blue-100 sticky top-0 z-20'>
                                    <tr>
                                        <th className='w-8'>
                                            <input
                                                type='checkbox'
                                                className='checkbox checkbox-xs rounded-none'
                                                checked={filteredProducts.length > 0 && selectedRowIds.length === filteredProducts.length}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className='font-medium text-neutral text-xs'>Mã hàng</th>
                                        <th className='font-medium text-neutral text-xs'>Tên hàng</th>
                                        <th className='font-medium text-neutral text-xs'>Thiết bị sử dụng</th>
                                        <th className='font-medium text-neutral text-xs'>Thương hiệu</th>
                                        <th className='font-medium text-neutral text-xs'>Dung lượng (Ah)</th>
                                        <th className='text-right font-medium text-neutral text-xs'>Đơn giá nhập</th>
                                        <th className='text-right font-medium text-neutral text-xs'>Đơn giá bán</th>
                                        <th className='text-right font-medium text-neutral text-xs'>
                                            Tồn kho
                                            {currentLocationId ? ' (chi nhánh)' : ''}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='text-xs'>
                                    {filteredProducts.map((p) => (
                                        <tr
                                            key={p._id || p.id}
                                            role='button'
                                            tabIndex={0}
                                            onClick={() => handleRowClick(p)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleRowClick(p)}
                                            className='cursor-pointer hover:bg-base-200/60 transition-colors font-light'
                                        >
                                            <td onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type='checkbox'
                                                    className='checkbox checkbox-xs rounded-none'
                                                    checked={selectedRowIds.includes((p._id || p.id).toString())}
                                                    onChange={() => toggleSelectRow((p._id || p.id).toString())}
                                                />
                                            </td>
                                            <td>{p.sku}</td>
                                            <td>{p.name}</td>
                                            <td>{p.usageDevice?.name || p.usageDevice || '...'}</td>
                                            <td>{p.brand?.name || '...'}</td>
                                            <td>{p.capacity || '...'}</td>
                                            <td className='text-right'>{formatVND(p.costPrice)}</td>
                                            <td className='text-right'>{formatVND(p.price)}</td>
                                            <td className='text-right'>{p.stockAtLocation !== undefined ? p.stockAtLocation : (p.totalStock ?? '...')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loading && filteredProducts.length > 0 && pagination.totalPages > 1 && (
                        <div className='flex justify-between items-center p-4 border-t border-base-200'>
                            <p className='text-sm text-base-content/60'>
                                Hiển thị {filteredProducts.length} / {pagination.total} sản phẩm
                            </p>
                            <div className='join'>
                                <button
                                    className='join-item btn btn-sm'
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                >
                                    «
                                </button>
                                <button className='join-item btn btn-sm'>
                                    Trang {pagination.page} / {pagination.totalPages}
                                </button>
                                <button
                                    className='join-item btn btn-sm'
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                >
                                    »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal chi tiết sản phẩm */}
            {showDetailModal &&
                selectedProduct &&
                (() => {
                    const imgs = (selectedProduct.images?.length ? selectedProduct.images : selectedProduct.image ? [selectedProduct.image] : []).slice(0, 5);
                    const mainUrl = imgs[detailImageIndex];
                    const otherIndices = imgs.map((_, i) => i).filter((i) => i !== detailImageIndex);
                    const isValidUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);
                    return (
                        <dialog
                            className='modal modal-open'
                            role='dialog'
                            aria-modal='true'
                            aria-labelledby='product-detail-title'
                        >
                            <div className='modal-box max-w-4xl max-h-[90vh] overflow-y-auto'>
                                <div className='flex items-center justify-between mb-6'>
                                    <h3
                                        id='product-detail-title'
                                        className='font-bold text-xl text-base-content'
                                    >
                                        Chi tiết sản phẩm
                                    </h3>
                                    <button
                                        type='button'
                                        className='btn btn-ghost btn-sm btn-square border-none'
                                        onClick={closeDetailModal}
                                        aria-label='Đóng'
                                    >
                                        <X className='w-5 h-5' />
                                    </button>
                                </div>

                                <div className='flex flex-col md:flex-row gap-8'>
                                    {/* Khối hình ảnh: ảnh chính trái + 4 ô nhỏ phải (tối đa 5 ảnh) */}
                                    <div className='shrink-0 flex flex-row gap-3'>
                                        <div className='w-64 h-64 md:w-72 md:h-72 rounded-xl overflow-hidden bg-base-200 flex items-center justify-center border border-base-300'>
                                            {mainUrl && isValidUrl(mainUrl) ? (
                                                <img
                                                    src={mainUrl}
                                                    alt={selectedProduct.name}
                                                    className='w-full h-full object-contain'
                                                />
                                            ) : (
                                                <ImageIcon
                                                    className='w-16 h-16 text-base-content/30'
                                                    aria-hidden
                                                />
                                            )}
                                        </div>
                                        <div className='flex flex-col gap-2'>
                                            {[0, 1, 2, 3].map((k) => {
                                                const idx = otherIndices[k];
                                                const url = idx !== undefined ? imgs[idx] : null;
                                                const hasUrl = url && isValidUrl(url);
                                                return (
                                                    <button
                                                        key={k}
                                                        type='button'
                                                        className='w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden flex items-center justify-center border-2 border-base-300 hover:border-primary/50 transition-colors bg-base-200'
                                                        onClick={() => idx !== undefined && setDetailImageIndex(idx)}
                                                        aria-label={hasUrl ? `Xem ảnh ${idx + 1}` : 'Ô ảnh trống'}
                                                    >
                                                        {hasUrl ? (
                                                            <img
                                                                src={url}
                                                                alt=''
                                                                className='w-full h-full object-cover'
                                                            />
                                                        ) : (
                                                            <ImageIcon
                                                                className='w-6 h-6 text-base-content/25'
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Thông tin sản phẩm */}
                                    <div className='flex-1 min-w-0 space-y-5'>
                                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm'>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Loại hàng</span>
                                                <span className='font-medium'>{selectedProduct.category?.name || '—'}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Thương hiệu</span>
                                                <span className='font-medium'>{selectedProduct.brand?.name || '—'}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Mã hàng</span>
                                                <span className='font-mono font-medium'>{selectedProduct.sku}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Mã vạch</span>
                                                <span className='font-mono'>{selectedProduct.barcode || '—'}</span>
                                            </div>
                                            <div className='sm:col-span-2 flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Tên hàng</span>
                                                <span className='font-medium text-base-content'>{selectedProduct.name}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Thiết bị sử dụng</span>
                                                <span>{selectedProduct.usageDevice?.name || selectedProduct.usageDevice || '—'}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Dung lượng (Ah)</span>
                                                <span>{selectedProduct.capacity || '—'}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Đơn giá nhập</span>
                                                <span>{formatVND(selectedProduct.costPrice)}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Đơn giá bán</span>
                                                <span className='font-medium text-primary'>{formatVND(selectedProduct.price)}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>
                                                    Tồn kho{currentLocationId ? ' (chi nhánh)' : ''}
                                                </span>
                                                <span className='font-medium'>
                                                    {selectedProduct.stockAtLocation !== undefined ? selectedProduct.stockAtLocation : (selectedProduct.totalStock ?? '—')}
                                                </span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Bảo hành</span>
                                                <span>{selectedProduct.warrantyText || '—'}</span>
                                            </div>
                                            <div className='flex flex-col gap-0.5'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide'>Đang kinh doanh</span>
                                                <span>{selectedProduct.isActive ? 'Có' : 'Không'}</span>
                                            </div>
                                        </div>

                                        {selectedProduct.notes ? (
                                            <div className='pt-2 border-t border-base-200'>
                                                <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide block mb-1'>Ghi chú</span>
                                                <p className='text-sm bg-base-200/50 rounded-lg p-3 text-base-content/90'>{selectedProduct.notes}</p>
                                            </div>
                                        ) : null}

                                        <div className='flex flex-wrap gap-2 pt-2'>
                                            <button
                                                type='button'
                                                className='btn btn-outline btn-sm gap-2'
                                                onClick={openBarcodeModal}
                                            >
                                                <Printer className='w-4 h-4' />
                                                In tem mã
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className='modal-action mt-8 pt-6 border-t border-base-200'>
                                    <button
                                        type='button'
                                        className='btn btn-ghost'
                                        onClick={closeDetailModal}
                                    >
                                        Đóng
                                    </button>
                                    <div className='flex gap-2'>
                                        <button
                                            type='button'
                                            className='btn btn-error btn-outline gap-2'
                                            onClick={handleDeleteClick}
                                            aria-label='Xóa sản phẩm'
                                        >
                                            <Trash2 className='w-4 h-4' />
                                            Xóa sản phẩm
                                        </button>
                                        <button
                                            type='button'
                                            className='btn btn-primary gap-2'
                                            onClick={openEditModal}
                                        >
                                            <Pencil className='w-4 h-4' />
                                            Chỉnh sửa sản phẩm
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <form
                                method='dialog'
                                className='modal-backdrop'
                            >
                                <button
                                    type='button'
                                    onClick={closeDetailModal}
                                >
                                    Đóng
                                </button>
                            </form>
                        </dialog>
                    );
                })()}

            {/* Modal chọn loại giấy in tem mã */}
            {showBarcodeModal && selectedProduct && (
                <dialog
                    className='modal modal-open'
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='barcode-modal-title'
                >
                    <div className='modal-box max-w-lg max-h-[90vh] overflow-y-auto'>
                        <div className='flex justify-between items-center mb-4'>
                            <h3
                                id='barcode-modal-title'
                                className='font-bold text-lg'
                            >
                                In tem mã vạch 35×22mm
                            </h3>
                            <button
                                type='button'
                                className='btn btn-ghost btn-sm btn-square border-none'
                                onClick={() => setShowBarcodeModal(false)}
                                aria-label='Đóng'
                            >
                                <X className='w-5 h-5' />
                            </button>
                        </div>
                        <div className='flex flex-col sm:flex-row gap-5'>
                            {/* Thiết lập in */}
                            <div className='flex-1 min-w-0 space-y-3'>
                                <div>
                                    <label className='label py-0'>
                                        <span className='label-text font-medium'>Số lượng in</span>
                                    </label>
                                    <input
                                        type='number'
                                        min={1}
                                        max={500}
                                        className='input input-sm outline-none w-full focus:border-primary'
                                        value={barcodePrintQty}
                                        onChange={(e) => setBarcodePrintQty(Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                                    />
                                </div>
                                <div>
                                    <label className='label py-0'>
                                        <span className='label-text'>Mã hàng</span>
                                    </label>
                                    <input
                                        type='text'
                                        className='input input-sm outline-none w-full focus:border-primary bg-base-200'
                                        value={selectedProduct.sku || ''}
                                        readOnly
                                    />
                                </div>
                                <label className='label cursor-pointer gap-2 py-0'>
                                    <input
                                        type='checkbox'
                                        className='checkbox checkbox-sm'
                                        checked={barcodeShowPrice}
                                        onChange={(e) => setBarcodeShowPrice(e.target.checked)}
                                    />
                                    <span className='label-text'>Giá kèm VND</span>
                                </label>
                                <button
                                    type='button'
                                    className='btn btn-success btn-sm gap-2 w-full'
                                    onClick={handleExportBarcodeExcel}
                                >
                                    <FileSpreadsheet className='w-4 h-4' />
                                    Xuất file Excel
                                </button>
                            </div>
                            {/* In tem */}
                            <div className='shrink-0 flex flex-col items-center justify-center gap-2'>
                                <button
                                    type='button'
                                    className='btn btn-primary btn-sm gap-1'
                                    onClick={() => handlePrintBarcode()}
                                >
                                    <Barcode className='w-4 h-4' />
                                    Xem bản in
                                </button>
                                <p className='text-[11px] text-amber-600 font-medium text-center'>
                                    Chọn <strong>70×22mm</strong> trong hộp thoại in
                                </p>
                            </div>
                        </div>
                        <div className='mt-4 text-[11px] text-base-content/50 bg-base-200/50 rounded-lg px-2.5 py-2'>
                            In tối đa 500 tem/lần. Mã không chứa ký tự đặc biệt.
                        </div>
                    </div>
                    <form
                        method='dialog'
                        className='modal-backdrop'
                    >
                        <button
                            type='button'
                            onClick={() => setShowBarcodeModal(false)}
                        >
                            Đóng
                        </button>
                    </form>
                </dialog>
            )}

            {/* Modal chỉnh sửa sản phẩm */}
            {showEditModal && selectedProduct && (
                <dialog
                    className='modal modal-open'
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='product-edit-title'
                >
                    <div className='modal-box max-w-4xl max-h-[90vh] overflow-y-auto p-0'>
                        <div className='sticky top-0 z-10 bg-base-100 border-b border-base-200 px-6 py-4 flex items-center justify-between'>
                            <h3
                                id='product-edit-title'
                                className='font-bold text-xl text-base-content'
                            >
                                Chỉnh sửa sản phẩm
                            </h3>
                            <button
                                type='button'
                                className='btn btn-ghost btn-sm btn-square'
                                onClick={closeEditModal}
                                aria-label='Đóng'
                            >
                                <X className='w-5 h-5' />
                            </button>
                        </div>
                        <form
                            onSubmit={handleUpdateProduct}
                            className='flex flex-col'
                        >
                            <div className='p-6 flex flex-col md:flex-row gap-8'>
                                {/* Cột trái: Hình ảnh */}
                                <div className='shrink-0'>
                                    <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide block mb-2'>Hình ảnh (tối đa 5)</span>
                                    {(() => {
                                        const imgs = (Array.isArray(editFormData.images) ? editFormData.images : []).slice(0, 5);
                                        const mainUrl = imgs[editImageIndex];
                                        const otherIndices = imgs.map((_, i) => i).filter((i) => i !== editImageIndex);
                                        const isValidUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);
                                        const removeEditImage = (idx) => {
                                            setEditFormData((prev) => ({
                                                ...prev,
                                                images: (prev.images || []).filter((_, i) => i !== idx),
                                            }));
                                            if (editImageIndex === idx) setEditImageIndex(0);
                                            else if (editImageIndex > idx) setEditImageIndex((i) => Math.max(0, i - 1));
                                        };
                                        return (
                                            <>
                                                <div className='flex flex-row gap-3 mb-2'>
                                                    <div className='relative shrink-0 w-40 h-40 rounded-xl overflow-hidden bg-base-200 flex items-center justify-center border border-base-300'>
                                                        {mainUrl && isValidUrl(mainUrl) ? (
                                                            <>
                                                                <img
                                                                    src={mainUrl}
                                                                    alt=''
                                                                    className='w-full h-full object-contain'
                                                                />
                                                                <button
                                                                    type='button'
                                                                    className='absolute top-1 right-1 btn btn-ghost btn-xs btn-circle bg-base-100/90 border border-base-300'
                                                                    onClick={(ev) => {
                                                                        ev.stopPropagation();
                                                                        removeEditImage(editImageIndex);
                                                                    }}
                                                                    aria-label='Xóa ảnh chính'
                                                                >
                                                                    <X className='w-3 h-3' />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <ImageIcon
                                                                className='w-10 h-10 text-base-content/30'
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </div>
                                                    <div className='flex flex-col gap-2'>
                                                        {[0, 1, 2, 3].map((k) => {
                                                            if (imgs.length < 5 && k === 0) {
                                                                return (
                                                                    <label
                                                                        key='add'
                                                                        className='w-14 h-14 rounded-lg border-2 border-dashed border-base-300 hover:border-primary/50 bg-base-200 flex items-center justify-center cursor-pointer transition-colors'
                                                                    >
                                                                        <input
                                                                            type='file'
                                                                            accept='image/jpeg,image/png,image/webp,image/gif'
                                                                            multiple
                                                                            className='hidden'
                                                                            disabled={imageUploading}
                                                                            onChange={async (e) => {
                                                                                const files = e.target.files ? Array.from(e.target.files) : [];
                                                                                if (files.length === 0) return;
                                                                                const oversized = files.filter((f) => f.size > 3 * 1024 * 1024);
                                                                                if (oversized.length) {
                                                                                    toast.error('Mỗi ảnh tối đa 3MB');
                                                                                    e.target.value = '';
                                                                                    return;
                                                                                }
                                                                                setImageUploading(true);
                                                                                try {
                                                                                    const res = await uploadProductImage(files);
                                                                                    if (res?.success && res?.data?.urls?.length) {
                                                                                        setEditFormData((prev) => ({
                                                                                            ...prev,
                                                                                            images: [...(prev.images || []), ...(res.data.urls || [])].slice(0, 5),
                                                                                        }));
                                                                                        toast.success(`Đã tải ảnh lên`);
                                                                                    } else {
                                                                                        toast.error(res?.message || 'Tải ảnh thất bại');
                                                                                    }
                                                                                } catch (err) {
                                                                                    toast.error(err?.response?.data?.message || 'Tải ảnh thất bại');
                                                                                } finally {
                                                                                    setImageUploading(false);
                                                                                    e.target.value = '';
                                                                                }
                                                                            }}
                                                                        />
                                                                        {imageUploading ? (
                                                                            <span className='loading loading-spinner loading-sm' />
                                                                        ) : (
                                                                            <Plus className='w-6 h-6 text-base-content/50' />
                                                                        )}
                                                                    </label>
                                                                );
                                                            }
                                                            const idx = otherIndices[k - (imgs.length < 5 ? 1 : 0)];
                                                            const url = idx !== undefined ? imgs[idx] : null;
                                                            const hasUrl = url && isValidUrl(url);
                                                            return (
                                                                <div
                                                                    key={k}
                                                                    className='relative group w-14 h-14 rounded-lg overflow-hidden border-2 border-base-300 bg-base-200 shrink-0'
                                                                >
                                                                    {hasUrl ? (
                                                                        <>
                                                                            <button
                                                                                type='button'
                                                                                className='w-full h-full block'
                                                                                onClick={() => setEditImageIndex(idx)}
                                                                            >
                                                                                <img
                                                                                    src={url}
                                                                                    alt=''
                                                                                    className='w-full h-full object-cover'
                                                                                />
                                                                            </button>
                                                                            <button
                                                                                type='button'
                                                                                className='absolute top-0 right-0 btn btn-ghost btn-xs btn-circle bg-base-100/90 border border-base-300 opacity-0 group-hover:opacity-100'
                                                                                onClick={(ev) => {
                                                                                    ev.stopPropagation();
                                                                                    removeEditImage(idx);
                                                                                }}
                                                                                aria-label='Xóa ảnh'
                                                                            >
                                                                                <X className='w-3 h-3' />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <div className='w-full h-full flex items-center justify-center'>
                                                                            <ImageIcon className='w-6 h-6 text-base-content/25' />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                {/* Cột phải: Form */}
                                <div className='flex-1 min-w-0 space-y-6'>
                                    <section>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Thông tin cơ bản</h4>
                                        <div className='space-y-3'>
                                            <div className='grid grid-cols-3 gap-3'>
                                                <CategoryBrandSelect
                                                    type='category'
                                                    label='Loại hàng'
                                                    value={editFormData.category}
                                                    refreshKey={categoryRefreshKey}
                                                    onChange={(id) => setEditFormData({ ...editFormData, category: id })}
                                                    onCreateNew={handleCreateCategory}
                                                    onEdit={handleEditCategory}
                                                    placeholder='Chọn loại hàng'
                                                />
                                                <CategoryBrandSelect
                                                    type='usageDevice'
                                                    label='Thiết bị sử dụng'
                                                    value={editFormData.usageDevice}
                                                    refreshKey={usageDeviceRefreshKey}
                                                    onChange={(id) => setEditFormData({ ...editFormData, usageDevice: id })}
                                                    onCreateNew={handleCreateUsageDevice}
                                                    onEdit={handleEditUsageDevice}
                                                    placeholder='Chọn thiết bị sử dụng'
                                                />
                                                <CategoryBrandSelect
                                                    type='brand'
                                                    label='Thương hiệu'
                                                    value={editFormData.brand}
                                                    refreshKey={brandRefreshKey}
                                                    onChange={(id) => setEditFormData({ ...editFormData, brand: id })}
                                                    onCreateNew={handleCreateBrand}
                                                    onEdit={handleEditBrand}
                                                    placeholder='Chọn thương hiệu'
                                                />
                                            </div>
                                            <div className='grid grid-cols-2 gap-3'>
                                                <div>
                                                    <label className='label py-0'>
                                                        <span className='label-text text-xs font-medium'>
                                                            Mã hàng <span className='text-error'>*</span>
                                                        </span>
                                                    </label>
                                                    <input
                                                        type='text'
                                                        className='input input-bordered input-sm w-full'
                                                        value={editFormData.sku}
                                                        onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className='label py-0'>
                                                        <span className='label-text text-xs font-medium'>Mã vạch</span>
                                                    </label>
                                                    <input
                                                        type='text'
                                                        className='input input-bordered input-sm w-full'
                                                        value={editFormData.barcode}
                                                        onChange={(e) => setEditFormData({ ...editFormData, barcode: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>
                                                        Tên hàng <span className='text-error'>*</span>
                                                    </span>
                                                </label>
                                                <input
                                                    type='text'
                                                    className='input input-bordered input-sm w-full'
                                                    value={editFormData.name}
                                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Dung lượng (Ah)</span>
                                                </label>
                                                <input
                                                    type='text'
                                                    className='input input-bordered input-sm w-full'
                                                    value={editFormData.capacity}
                                                    onChange={(e) => setEditFormData({ ...editFormData, capacity: e.target.value })}
                                                    placeholder='VD: 100'
                                                />
                                            </div>
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Giá & Tồn kho</h4>
                                        <div className='grid grid-cols-3 gap-3'>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Giá nhập (VNĐ)</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={editFormData.costPrice || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, costPrice: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Giá bán (VNĐ)</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={editFormData.price || ''}
                                                    onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Tồn kho</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={editFormData.quantity}
                                                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Bảo hành</h4>
                                        <div>
                                            <label className='label py-0'>
                                                <span className='label-text text-xs font-medium'>Bảo hành</span>
                                            </label>
                                            <input
                                                type='text'
                                                className='input input-bordered input-sm w-full'
                                                placeholder='VD: 12 tháng, 1 năm, 15 ngày'
                                                value={editFormData.warrantyText}
                                                onChange={(e) => setEditFormData({ ...editFormData, warrantyText: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Khác</h4>
                                        <div className='space-y-3'>
                                            <label className='label cursor-pointer justify-start gap-2 py-0'>
                                                <input
                                                    type='checkbox'
                                                    className='checkbox checkbox-primary checkbox-sm'
                                                    checked={editFormData.isActive}
                                                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                                                />
                                                <span className='label-text text-sm'>Đang kinh doanh</span>
                                            </label>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Ghi chú</span>
                                                </label>
                                                <textarea
                                                    className='textarea textarea-bordered textarea-sm w-full mt-0.5'
                                                    rows={2}
                                                    placeholder='Ghi chú nội bộ...'
                                                    value={editFormData.notes}
                                                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                            <div className='modal-action px-6 py-4 bg-base-200/30 border-t border-base-200 rounded-b-2xl'>
                                <button
                                    type='button'
                                    className='btn btn-ghost'
                                    onClick={closeEditModal}
                                >
                                    Hủy
                                </button>
                                <button
                                    type='submit'
                                    className='btn btn-primary'
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className='loading loading-spinner loading-sm' /> Đang cập nhật...
                                        </>
                                    ) : (
                                        'Cập nhật'
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
                            onClick={closeEditModal}
                        >
                            Đóng
                        </button>
                    </form>
                </dialog>
            )}

            {/* Modal thêm sản phẩm */}
            {showCreateModal && (
                <dialog
                    className='modal modal-open'
                    role='dialog'
                    aria-modal='true'
                    aria-labelledby='product-create-title'
                >
                    <div className='modal-box max-w-4xl max-h-[90vh] overflow-y-auto p-0'>
                        <div className='sticky top-0 z-10 bg-base-100 border-b border-base-200 px-6 py-4 flex items-center justify-between'>
                            <h3
                                id='product-create-title'
                                className='font-bold text-xl text-base-content'
                            >
                                Thêm sản phẩm
                            </h3>
                            <button
                                type='button'
                                className='btn btn-ghost btn-sm btn-square'
                                onClick={closeCreateModal}
                                aria-label='Đóng'
                            >
                                <X className='w-5 h-5' />
                            </button>
                        </div>
                        <form
                            onSubmit={handleCreateProduct}
                            className='flex flex-col'
                        >
                            <div className='p-6 flex flex-col md:flex-row gap-8'>
                                {/* Cột trái: Hình ảnh */}
                                <div className='shrink-0'>
                                    <span className='text-xs font-medium text-base-content/60 uppercase tracking-wide block mb-2'>Hình ảnh (tối đa 5)</span>
                                    {(() => {
                                        const imgs = (Array.isArray(createFormData.images) ? createFormData.images : []).slice(0, 5);
                                        const mainUrl = imgs[createImageIndex];
                                        const otherIndices = imgs.map((_, i) => i).filter((i) => i !== createImageIndex);
                                        const isValidUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);
                                        const removeCreateImage = (idx) => {
                                            setCreateFormData((prev) => ({
                                                ...prev,
                                                images: (prev.images || []).filter((_, i) => i !== idx),
                                            }));
                                            if (createImageIndex === idx) setCreateImageIndex(0);
                                            else if (createImageIndex > idx) setCreateImageIndex((i) => Math.max(0, i - 1));
                                        };
                                        return (
                                            <>
                                                <div className='flex flex-row gap-3 mb-2'>
                                                    <div className='relative shrink-0 w-40 h-40 rounded-xl overflow-hidden bg-base-200 flex items-center justify-center border border-base-300'>
                                                        {mainUrl && isValidUrl(mainUrl) ? (
                                                            <>
                                                                <img
                                                                    src={mainUrl}
                                                                    alt=''
                                                                    className='w-full h-full object-contain'
                                                                />
                                                                <button
                                                                    type='button'
                                                                    className='absolute top-1 right-1 btn btn-ghost btn-xs btn-circle bg-base-100/90 border border-base-300'
                                                                    onClick={(ev) => {
                                                                        ev.stopPropagation();
                                                                        removeCreateImage(createImageIndex);
                                                                    }}
                                                                    aria-label='Xóa ảnh chính'
                                                                >
                                                                    <X className='w-3 h-3' />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <ImageIcon
                                                                className='w-10 h-10 text-base-content/30'
                                                                aria-hidden
                                                            />
                                                        )}
                                                    </div>
                                                    <div className='flex flex-col gap-2'>
                                                        {[0, 1, 2, 3].map((k) => {
                                                            if (imgs.length < 5 && k === 0) {
                                                                return (
                                                                    <label
                                                                        key='add'
                                                                        className='w-14 h-14 rounded-lg border-2 border-dashed border-base-300 hover:border-primary/50 bg-base-200 flex items-center justify-center cursor-pointer transition-colors'
                                                                    >
                                                                        <input
                                                                            type='file'
                                                                            accept='image/jpeg,image/png,image/webp,image/gif'
                                                                            multiple
                                                                            className='hidden'
                                                                            disabled={imageUploading}
                                                                            onChange={async (e) => {
                                                                                const files = e.target.files ? Array.from(e.target.files) : [];
                                                                                if (files.length === 0) return;
                                                                                const oversized = files.filter((f) => f.size > 3 * 1024 * 1024);
                                                                                if (oversized.length) {
                                                                                    toast.error('Mỗi ảnh tối đa 3MB');
                                                                                    e.target.value = '';
                                                                                    return;
                                                                                }
                                                                                setImageUploading(true);
                                                                                try {
                                                                                    const res = await uploadProductImage(files);
                                                                                    const urls = res?.data?.urls?.length ? res.data.urls : res?.data?.url ? [res.data.url] : [];
                                                                                    if (urls.length) {
                                                                                        setCreateFormData((prev) => ({
                                                                                            ...prev,
                                                                                            images: [...(Array.isArray(prev.images) ? prev.images : []), ...urls].slice(0, 5),
                                                                                        }));
                                                                                        toast.success('Đã tải ảnh lên');
                                                                                    } else {
                                                                                        toast.error(res?.message || 'Tải ảnh thất bại');
                                                                                    }
                                                                                } catch (err) {
                                                                                    toast.error(err?.response?.data?.message || 'Tải ảnh thất bại');
                                                                                } finally {
                                                                                    setImageUploading(false);
                                                                                    e.target.value = '';
                                                                                }
                                                                            }}
                                                                        />
                                                                        {imageUploading ? (
                                                                            <span className='loading loading-spinner loading-sm' />
                                                                        ) : (
                                                                            <Plus className='w-6 h-6 text-base-content/50' />
                                                                        )}
                                                                    </label>
                                                                );
                                                            }
                                                            const idx = otherIndices[k - (imgs.length < 5 ? 1 : 0)];
                                                            const url = idx !== undefined ? imgs[idx] : null;
                                                            const hasUrl = url && isValidUrl(url);
                                                            return (
                                                                <div
                                                                    key={k}
                                                                    className='relative group w-14 h-14 rounded-lg overflow-hidden border-2 border-base-300 bg-base-200 shrink-0'
                                                                >
                                                                    {hasUrl ? (
                                                                        <>
                                                                            <button
                                                                                type='button'
                                                                                className='w-full h-full block'
                                                                                onClick={() => setCreateImageIndex(idx)}
                                                                            >
                                                                                <img
                                                                                    src={url}
                                                                                    alt=''
                                                                                    className='w-full h-full object-cover'
                                                                                />
                                                                            </button>
                                                                            <button
                                                                                type='button'
                                                                                className='absolute top-0 right-0 btn btn-ghost btn-xs btn-circle bg-base-100/90 border border-base-300 opacity-0 group-hover:opacity-100'
                                                                                onClick={(ev) => {
                                                                                    ev.stopPropagation();
                                                                                    removeCreateImage(idx);
                                                                                }}
                                                                                aria-label='Xóa ảnh'
                                                                            >
                                                                                <X className='w-3 h-3' />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <div className='w-full h-full flex items-center justify-center'>
                                                                            <ImageIcon className='w-6 h-6 text-base-content/25' />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                {/* Cột phải: Form */}
                                <div className='flex-1 min-w-0 space-y-6'>
                                    <section>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Thông tin cơ bản</h4>
                                        <div className='space-y-3'>
                                            <div className='grid grid-cols-3 gap-3'>
                                                <CategoryBrandSelect
                                                    type='category'
                                                    label='Loại hàng'
                                                    value={createFormData.category}
                                                    refreshKey={categoryRefreshKey}
                                                    onChange={(id) => setCreateFormData({ ...createFormData, category: id })}
                                                    onCreateNew={handleCreateCategory}
                                                    onEdit={handleEditCategory}
                                                    placeholder='Chọn loại hàng'
                                                />
                                                <CategoryBrandSelect
                                                    type='usageDevice'
                                                    label='Thiết bị sử dụng'
                                                    value={createFormData.usageDevice}
                                                    refreshKey={usageDeviceRefreshKey}
                                                    onChange={(id) => setCreateFormData({ ...createFormData, usageDevice: id })}
                                                    onCreateNew={handleCreateUsageDevice}
                                                    onEdit={handleEditUsageDevice}
                                                    placeholder='Chọn thiết bị sử dụng'
                                                />
                                                <CategoryBrandSelect
                                                    type='brand'
                                                    label='Thương hiệu'
                                                    value={createFormData.brand}
                                                    refreshKey={brandRefreshKey}
                                                    onChange={(id) => setCreateFormData({ ...createFormData, brand: id })}
                                                    onCreateNew={handleCreateBrand}
                                                    onEdit={handleEditBrand}
                                                    placeholder='Chọn thương hiệu'
                                                />
                                            </div>
                                            <div className='grid grid-cols-2 gap-3'>
                                                <div>
                                                    <label className='label py-0'>
                                                        <span className='label-text text-xs font-medium'>
                                                            Mã hàng <span className='text-error'>*</span>
                                                        </span>
                                                    </label>
                                                    <input
                                                        type='text'
                                                        className='input input-bordered input-sm w-full'
                                                        value={createFormData.sku}
                                                        onChange={(e) => setCreateFormData({ ...createFormData, sku: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className='label py-0'>
                                                        <span className='label-text text-xs font-medium'>Mã vạch</span>
                                                    </label>
                                                    <input
                                                        type='text'
                                                        className='input input-bordered input-sm w-full'
                                                        value={createFormData.barcode}
                                                        onChange={(e) => setCreateFormData({ ...createFormData, barcode: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>
                                                        Tên hàng <span className='text-error'>*</span>
                                                    </span>
                                                </label>
                                                <input
                                                    type='text'
                                                    className='input input-bordered input-sm w-full'
                                                    value={createFormData.name}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Dung lượng (Ah)</span>
                                                </label>
                                                <input
                                                    type='text'
                                                    className='input input-bordered input-sm w-full'
                                                    value={createFormData.capacity}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, capacity: e.target.value })}
                                                    placeholder='VD: 100'
                                                />
                                            </div>
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Giá & Tồn kho</h4>
                                        <div className='grid grid-cols-3 gap-3'>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Giá nhập (VNĐ)</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={createFormData.costPrice || ''}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, costPrice: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Giá bán (VNĐ)</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={createFormData.price || ''}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, price: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Tồn kho</span>
                                                </label>
                                                <input
                                                    type='number'
                                                    min={0}
                                                    className='input input-bordered input-sm w-full'
                                                    value={createFormData.quantity}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, quantity: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Bảo hành</h4>
                                        <div>
                                            <label className='label py-0'>
                                                <span className='label-text text-xs font-medium'>Bảo hành</span>
                                            </label>
                                            <input
                                                type='text'
                                                className='input input-bordered input-sm w-full'
                                                placeholder='VD: 12 tháng, 1 năm, 15 ngày'
                                                value={createFormData.warrantyText}
                                                onChange={(e) => setCreateFormData({ ...createFormData, warrantyText: e.target.value })}
                                            />
                                        </div>
                                    </section>
                                    <section className='pt-4 border-t border-base-200'>
                                        <h4 className='text-xs font-semibold text-base-content/70 uppercase tracking-wide mb-3'>Khác</h4>
                                        <div className='space-y-3'>
                                            <label className='label cursor-pointer justify-start gap-2 py-0'>
                                                <input
                                                    type='checkbox'
                                                    className='checkbox checkbox-primary checkbox-sm'
                                                    checked={createFormData.isActive}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, isActive: e.target.checked })}
                                                />
                                                <span className='label-text text-sm'>Đang kinh doanh</span>
                                            </label>
                                            <div>
                                                <label className='label py-0'>
                                                    <span className='label-text text-xs font-medium'>Ghi chú</span>
                                                </label>
                                                <textarea
                                                    className='textarea textarea-bordered textarea-sm w-full mt-0.5'
                                                    rows={2}
                                                    placeholder='Ghi chú nội bộ...'
                                                    value={createFormData.notes}
                                                    onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            </div>
                            <div className='modal-action px-6 py-4 bg-base-200/30 border-t border-base-200 rounded-b-2xl'>
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
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className='loading loading-spinner loading-sm' /> Đang thêm...
                                        </>
                                    ) : (
                                        'Thêm sản phẩm'
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
            )}

            {/* Modal thêm loại hàng */}
            {/* Modal category */}
            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => {
                        setShowCategoryModal(false);
                        setEditingCategory(null);
                    }}
                    onSubmit={handleSaveCategory}
                    onDelete={editingCategory ? handleDeleteCategory : undefined}
                    submitting={false}
                />
            )}

            {/* Modal brand */}
            {showBrandModal && (
                <BrandModal
                    brand={editingBrand}
                    onClose={() => {
                        setShowBrandModal(false);
                        setEditingBrand(null);
                    }}
                    onSubmit={handleSaveBrand}
                    onDelete={editingBrand ? handleDeleteBrand : undefined}
                    submitting={false}
                />
            )}

            {/* Modal thiết bị sử dụng */}
            {showUsageDeviceModal && (
                <UsageDeviceModal
                    device={editingUsageDevice}
                    onClose={() => {
                        setShowUsageDeviceModal(false);
                        setEditingUsageDevice(null);
                    }}
                    onSubmit={handleSaveUsageDevice}
                    onDelete={editingUsageDevice ? handleDeleteUsageDevice : undefined}
                    submitting={false}
                />
            )}

            <ConfirmationModal
                isOpen={confirmDeleteModal.isOpen}
                onClose={() => setConfirmDeleteModal({ isOpen: false, onConfirm: null })}
                onConfirm={confirmDeleteModal.onConfirm}
                title='Xóa sản phẩm'
                message='Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.'
                confirmText='Xóa'
                cancelText='Hủy'
                variant='danger'
            />
        </div>
    );
};

export default ProductListTab;
