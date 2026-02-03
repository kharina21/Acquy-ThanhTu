import React, { useEffect, useState } from 'react';
import { DollarSign, Search, Save } from 'lucide-react';
import { getProducts, updateProduct } from '@/services/productService';
import { toast } from 'sonner';

const formatVND = (num) => {
    if (num == null || isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
};

const PriceSettingsTab = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [search, setSearch] = useState('');
    const [edits, setEdits] = useState({});
    const [savingId, setSavingId] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        const res = await getProducts({
            page: pagination.page,
            limit: pagination.limit,
            search: search.trim() || undefined,
        });
        if (res.success && res.data) {
            setProducts(res.data.products || []);
            setPagination(res.data.pagination || pagination);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, [pagination.page, search]);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        setPagination((p) => ({ ...p, page: 1 }));
    };

    const getCostPrice = (p) => edits[p._id]?.costPrice !== undefined ? edits[p._id].costPrice : (p.costPrice ?? 0);
    const getPrice = (p) => edits[p._id]?.price !== undefined ? edits[p._id].price : (p.price ?? 0);

    const setCostPrice = (id, value) => {
        const num = value === '' ? '' : Number(value);
        setEdits((prev) => ({
            ...prev,
            [id]: { ...prev[id], costPrice: num === '' ? '' : (isNaN(num) ? prev[id]?.costPrice : num) },
        }));
    };

    const setPrice = (id, value) => {
        const num = value === '' ? '' : Number(value);
        setEdits((prev) => ({
            ...prev,
            [id]: { ...prev[id], price: num === '' ? '' : (isNaN(num) ? prev[id]?.price : num) },
        }));
    };

    const handleSaveRow = async (p) => {
        const costPrice = getCostPrice(p);
        const price = getPrice(p);
        const costNum = typeof costPrice === 'number' ? costPrice : (parseFloat(costPrice) || 0);
        const priceNum = typeof price === 'number' ? price : (parseFloat(price) || 0);
        setSavingId(p._id);
        try {
            await updateProduct(p._id, {
                costPrice: costNum,
                price: priceNum,
            });
            toast.success('Đã lưu giá');
            setEdits((prev) => {
                const next = { ...prev };
                delete next[p._id];
                return next;
            });
            fetchProducts();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lưu thất bại');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="bg-base-100 rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
                <DollarSign className="w-6 h-6 text-primary" />
                <h2 className="text-lg font-bold">Thiết lập giá</h2>
            </div>
            <p className="text-base-content/70 mb-6">
                Chỉnh sửa giá vốn và giá bán (bảng giá chung) cho từng mặt hàng.
            </p>

            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40" />
                    <input
                        type="text"
                        placeholder="Tìm theo mã hàng, tên hàng, thương hiệu..."
                        className="input input-bordered w-full pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn btn-primary">
                    Tìm kiếm
                </button>
            </form>

            <div className="overflow-x-auto overflow-y-auto max-h-[700px] rounded-lg border border-base-300">
                {loading ? (
                    <div className="flex justify-center items-center p-12">
                        <span className="loading loading-spinner loading-lg text-primary" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="p-12 text-center text-base-content/60">
                        Không có sản phẩm nào. Thử bỏ bớt điều kiện tìm kiếm.
                    </div>
                ) : (
                    <table className="table">
                        <thead className='bg-blue-100 sticky top-0 z-20'>
                            <tr>
                                <th className="w-32 font-medium text-neutral text-xs">Mã hàng</th>
                                <th className="font-medium text-neutral text-xs">Tên hàng</th>
                                <th className="text-right w-40 font-medium text-neutral text-xs">Giá vốn (VNĐ)</th>
                                <th className="text-right w-40 font-medium text-neutral text-xs">Bảng giá chung (VNĐ)</th>
                                <th className="w-24 font-medium text-neutral text-xs"></th>
                            </tr>
                        </thead>
                        <tbody className='text-xs'>
                            {products.map((p) => (
                                <tr key={p._id} className="hover:bg-base-200/60 transition-colors font-light">
                                    <td className="font-medium">{p.sku}</td>
                                    <td>{p.name}</td>
                                    <td className="text-right">
                                        <input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            className="input input-bordered input-sm w-full text-right"
                                            value={getCostPrice(p) === '' ? '' : getCostPrice(p)}
                                            onChange={(e) => setCostPrice(p._id, e.target.value)}
                                        />
                                    </td>
                                    <td className="text-right">
                                        <input
                                            type="number"
                                            min={0}
                                            step={1000}
                                            className="input input-bordered input-sm w-full text-right"
                                            value={getPrice(p) === '' ? '' : getPrice(p)}
                                            onChange={(e) => setPrice(p._id, e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs gap-1"
                                            onClick={() => handleSaveRow(p)}
                                            disabled={savingId === p._id}
                                        >
                                            {savingId === p._id ? (
                                                <span className="loading loading-spinner loading-xs" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            Lưu
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {!loading && products.length > 0 && pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
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
    );
};

export default PriceSettingsTab;
