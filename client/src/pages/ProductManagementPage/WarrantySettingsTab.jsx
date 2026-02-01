import React, { useEffect, useState, useMemo } from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { getProductOptions, countProductsByFilter, bulkUpdateWarranty } from '@/services/productService';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

const WarrantySettingsTab = () => {
    const [productOptions, setProductOptions] = useState({ category: [], brand: [] });
    const [filter, setFilter] = useState({ category: '', brand: '' });
    const [warrantyMonths, setWarrantyMonths] = useState('');
    const [warrantyText, setWarrantyText] = useState('');
    const [previewCount, setPreviewCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

    const optionCategories = useMemo(() => (productOptions.category || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)), [productOptions.category]);
    const optionBrands = useMemo(() => (productOptions.brand || []).filter(Boolean).sort((a, b) => String(a).localeCompare(b)), [productOptions.brand]);

    useEffect(() => {
        const load = async () => {
            const res = await getProductOptions();
            if (res.success && res.data) setProductOptions(res.data);
        };
        load();
    }, []);

    const fetchPreviewCount = async () => {
        setLoadingCount(true);
        const count = await countProductsByFilter({ category: filter.category || undefined, brand: filter.brand || undefined });
        setPreviewCount(count);
        setLoadingCount(false);
    };

    useEffect(() => {
        fetchPreviewCount();
    }, [filter.category, filter.brand]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const months = warrantyMonths.trim() === '' ? null : parseInt(warrantyMonths, 10);
        if (warrantyMonths.trim() !== '' && (Number.isNaN(months) || months < 0)) {
            toast.error('Số tháng bảo hành phải là số không âm');
            return;
        }
        if ((warrantyMonths.trim() === '' || months === null) && !warrantyText.trim()) {
            toast.error('Nhập ít nhất số tháng bảo hành hoặc ghi chú bảo hành');
            return;
        }
        if (previewCount === 0) {
            toast.error('Không có sản phẩm nào thỏa bộ lọc');
            return;
        }
        setConfirmModal({
            isOpen: true,
            title: 'Xác nhận cập nhật bảo hành',
            message: `Áp dụng bảo hành cho ${previewCount} sản phẩm${filter.category ? ` (loại: ${filter.category})` : ''}${filter.brand ? ` (thương hiệu: ${filter.brand})` : ''}. Bạn có chắc?`,
            onConfirm: async () => {
                setSubmitting(true);
                try {
                    const payload = {
                        category: filter.category || undefined,
                        brand: filter.brand || undefined,
                        warrantyMonths: months !== null ? months : undefined,
                        warrantyText: warrantyText.trim() || undefined,
                    };
                    if (payload.warrantyMonths === undefined && payload.warrantyText === undefined) {
                        toast.error('Vui lòng nhập ít nhất một trường bảo hành');
                        setSubmitting(false);
                        return;
                    }
                    const res = await bulkUpdateWarranty(payload);
                    toast.success(res?.message || 'Đã cập nhật bảo hành');
                    setWarrantyMonths('');
                    setWarrantyText('');
                    fetchPreviewCount();
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Cập nhật bảo hành thất bại');
                } finally {
                    setSubmitting(false);
                }
            },
        });
    };

    return (
        <div className="bg-base-100 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
                <Shield className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-bold">Thiết lập bảo hành</h2>
            </div>
            <p className="text-base-content/70 mb-6">
                Cập nhật bảo hành hàng loạt theo loại hàng, thương hiệu. Nhập số tháng và/hoặc ghi chú bảo hành.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="label"><span className="label-text">Loại hàng</span></label>
                        <select
                            className="select select-bordered w-full"
                            value={filter.category}
                            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
                        >
                            <option value="">— Tất cả —</option>
                            {optionCategories.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="label"><span className="label-text">Thương hiệu</span></label>
                        <select
                            className="select select-bordered w-full"
                            value={filter.brand}
                            onChange={(e) => setFilter((f) => ({ ...f, brand: e.target.value }))}
                        >
                            <option value="">— Tất cả —</option>
                            {optionBrands.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-4 bg-base-200/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Số sản phẩm sẽ áp dụng</p>
                    {loadingCount ? (
                        <span className="loading loading-dots loading-sm" />
                    ) : (
                        <p className="text-2xl font-bold text-primary">{previewCount}</p>
                    )}
                </div>

                <div>
                    <label className="label"><span className="label-text font-semibold">Bảo hành (tháng)</span></label>
                    <input
                        type="number"
                        min={0}
                        className="input input-bordered w-full max-w-xs"
                        value={warrantyMonths}
                        onChange={(e) => setWarrantyMonths(e.target.value)}
                        placeholder="VD: 12 (để trống nếu không đổi)"
                    />
                </div>

                <div>
                    <label className="label"><span className="label-text font-semibold">Ghi chú bảo hành</span></label>
                    <input
                        type="text"
                        className="input input-bordered w-full"
                        value={warrantyText}
                        onChange={(e) => setWarrantyText(e.target.value)}
                        placeholder="VD: 12 tháng chính hãng"
                    />
                </div>

                <div className="flex gap-2">
                    <button type="submit" className="btn btn-primary gap-2" disabled={submitting || previewCount === 0}>
                        {submitting ? <span className="loading loading-spinner loading-sm" /> : <RefreshCw className="w-4 h-4" />}
                        Áp dụng bảo hành
                    </button>
                </div>
            </form>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal((c) => ({ ...c, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Áp dụng"
                cancelText="Hủy"
                variant="warning"
            />
        </div>
    );
};

export default WarrantySettingsTab;
