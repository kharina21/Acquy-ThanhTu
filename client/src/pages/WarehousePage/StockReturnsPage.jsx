import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { getStockReturns, getStockReturnById, deleteStockReturn } from '@/services/stockReturnService';
import { getSuppliers } from '@/services/supplierService';
import { useBranchStore } from '@/stores/useBranchStore';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { toast } from 'sonner';

const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const StockReturnsPage = () => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', code: '', stockInCode: '', supplierId: '' });
    const [debouncedCode, setDebouncedCode] = useState('');
    const [debouncedStockInCode, setDebouncedStockInCode] = useState('');
    const [suppliers, setSuppliers] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedDetail, setExpandedDetail] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

    const currentLocationId = useBranchStore((s) => s.currentLocationId);

    const fetchList = async (overridePage) => {
        setLoading(true);
        const page = overridePage !== undefined ? overridePage : pagination.page;
        const params = { page, limit: pagination.limit };
        if (currentLocationId) params.locationId = currentLocationId;
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;
        if (debouncedCode?.trim()) params.code = debouncedCode.trim();
        if (debouncedStockInCode?.trim()) params.stockInCode = debouncedStockInCode.trim();
        if (filters.supplierId) params.supplierId = filters.supplierId;

        const res = await getStockReturns(params);
        if (res.success && res.data) {
            setList(res.data.stockReturns || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        const loadSuppliers = async () => {
            const res = await getSuppliers();
            if (res.success && res.data?.suppliers) {
                setSuppliers((res.data.suppliers || []).filter((s) => s.isActive !== false));
            }
        };
        loadSuppliers();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedCode(filters.code), 400);
        return () => clearTimeout(t);
    }, [filters.code]);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedStockInCode(filters.stockInCode), 400);
        return () => clearTimeout(t);
    }, [filters.stockInCode]);

    useEffect(() => {
        setPagination((p) => ({ ...p, page: 1 }));
    }, [filters.fromDate, filters.toDate, debouncedCode, debouncedStockInCode, filters.supplierId, currentLocationId]);

    useEffect(() => {
        fetchList();
    }, [pagination.page, filters.fromDate, filters.toDate, debouncedCode, debouncedStockInCode, filters.supplierId, currentLocationId]);

    const toggleExpand = async (sr) => {
        const id = sr._id;
        if (expandedId === id) {
            setExpandedId(null);
            setExpandedDetail(null);
            return;
        }
        setExpandedId(id);
        setExpandedDetail(null);
        const res = await getStockReturnById(id);
        if (res.success && res.data?.stockReturn) {
            setExpandedDetail(res.data.stockReturn);
        }
    };

    const handleCancelStockReturn = (sr) => {
        const idToDelete = sr._id;
        setConfirmModal({
            isOpen: true,
            title: 'Hủy phiếu trả hàng',
            message: `Hủy phiếu ${sr.code} sẽ cộng lại tồn kho (đảo ngược trả hàng). Bạn có chắc?`,
            variant: 'danger',
            confirmText: 'Hủy phiếu',
            onConfirm: async () => {
                try {
                    const res = await deleteStockReturn(idToDelete);
                    if (res.success) {
                        toast.success('Đã hủy phiếu trả hàng');
                        setExpandedId(null);
                        setExpandedDetail(null);
                        fetchList();
                    }
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Hủy phiếu thất bại');
                }
            },
        });
    };

    return (
        <div className='flex-1 p-6 bg-base-200 overflow-y-auto'>
            <div className='container mx-auto'>
                <h1 className='text-2xl font-bold text-base-content mb-6'>Trả hàng nhập</h1>

                <div className='space-y-4'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                        <p className='text-base-content/70 text-sm'>
                            Phiếu trả hàng được tạo từ trang Nhập hàng khi bấm &quot;Trả hàng&quot; trên phiếu đã xác nhận.
                        </p>
                        <div className='flex flex-wrap gap-2'>
                            <input
                                type='text'
                                className='input input-bordered input-sm w-36'
                                placeholder='Mã phiếu trả'
                                value={filters.code}
                                onChange={(e) => setFilters((f) => ({ ...f, code: e.target.value }))}
                            />
                            <input
                                type='text'
                                className='input input-bordered input-sm w-36'
                                placeholder='Mã phiếu nhập'
                                value={filters.stockInCode}
                                onChange={(e) => setFilters((f) => ({ ...f, stockInCode: e.target.value }))}
                            />
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
                            <input
                                type='date'
                                className='input input-bordered input-sm w-40'
                                value={filters.fromDate}
                                onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                            />
                            <input
                                type='date'
                                className='input input-bordered input-sm w-40'
                                value={filters.toDate}
                                onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className='bg-base-100 rounded-lg shadow overflow-hidden'>
                        {loading ? (
                            <div className='flex justify-center py-12'>
                                <span className='loading loading-spinner loading-lg'></span>
                            </div>
                        ) : list.length === 0 ? (
                            <div className='text-center py-12 text-base-content/60'>
                                <p>Chưa có phiếu trả hàng nào.</p>
                            </div>
                        ) : (
                            <>
                                <div className='overflow-x-auto w-full'>
                                    <table className='table w-full min-w-full'>
                                        <thead className='bg-blue-100 sticky top-0 z-20'>
                                            <tr>
                                                <th className='w-8'></th>
                                                <th>Mã phiếu trả</th>
                                                <th>Phiếu nhập</th>
                                                <th>Nhà cung cấp</th>
                                                <th>Chi nhánh</th>
                                                <th>Ngày tạo</th>
                                                <th>Người tạo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((sr) => {
                                                const isExpanded = expandedId === sr._id;
                                                return (
                                                    <React.Fragment key={sr._id}>
                                                        <tr
                                                            className={`hover:bg-base-200/60 cursor-pointer ${isExpanded ? 'bg-primary/10' : ''}`}
                                                            onClick={() => toggleExpand(sr)}
                                                        >
                                                            <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                                                {isExpanded ? (
                                                                    <ChevronDown className='w-4 h-4' />
                                                                ) : (
                                                                    <ChevronRight className='w-4 h-4' />
                                                                )}
                                                            </td>
                                                            <td className='font-medium'>{sr.code}</td>
                                                            <td>{sr.stockIn?.code || '—'}</td>
                                                            <td>{sr.stockIn?.supplier?.code ? `${sr.stockIn.supplier.code} - ${sr.stockIn.supplier.name || ''}` : '—'}</td>
                                                            <td>{sr.location ? `${sr.location.code} - ${sr.location.name}` : '—'}</td>
                                                            <td>{formatDate(sr.createdAt)}</td>
                                                            <td>
                                                                {sr.createdBy
                                                                    ? `${sr.createdBy.firstName || ''} ${sr.createdBy.lastName || ''}`.trim() || sr.createdBy.username
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className='bg-primary/5'>
                                                                <td colSpan={7} className='p-4 border-l-4 border-l-primary'>
                                                                    {!expandedDetail ? (
                                                                        <div className='flex justify-center py-6'>
                                                                            <span className='loading loading-spinner loading-md' />
                                                                        </div>
                                                                    ) : (
                                                                        <div className='space-y-4' onClick={(e) => e.stopPropagation()}>
                                                                            {expandedDetail.note ? (
                                                                                <p className='text-sm'>
                                                                                    <span className='font-medium text-base-content/70'>Ghi chú:</span> {expandedDetail.note}
                                                                                </p>
                                                                            ) : null}
                                                                            <div className='overflow-x-auto border border-base-300 rounded-lg w-full'>
                                                                                <table className='table table-sm w-full min-w-full'>
                                                                                    <thead className='bg-blue-100 sticky top-0 z-20'>
                                                                                        <tr>
                                                                                            <th>Mã hàng</th>
                                                                                            <th>Tên sản phẩm</th>
                                                                                            <th className='text-right'>Số lượng trả</th>
                                                                                            <th>Lý do</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {expandedDetail.items?.map((it, idx) => (
                                                                                            <tr key={idx}>
                                                                                                <td>{it.product?.sku || '—'}</td>
                                                                                                <td>{it.product?.name || '—'}</td>
                                                                                                <td className='text-right'>{it.quantity}</td>
                                                                                                <td>{it.reason || '—'}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                            <div className='flex justify-start'>
                                                                                <button
                                                                                    type='button'
                                                                                    className='btn btn-outline btn-error btn-sm gap-1'
                                                                                    onClick={() => handleCancelStockReturn(expandedDetail)}
                                                                                >
                                                                                    <Trash2 className='w-4 h-4' />
                                                                                    Hủy phiếu trả hàng
                                                                                </button>
                                                                            </div>
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

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                    confirmText={confirmModal.confirmText}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
                />
            </div>
        </div>
    );
};

export default StockReturnsPage;
