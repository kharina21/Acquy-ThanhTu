import { useState, useEffect } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand } from '@/services/brandService';
import { toast } from 'sonner';
import { Tag, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import BrandModal from '@/components/common/BrandModal';

const BrandTable = ({ brands, loading, onEdit, onDelete }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (brands.length === 0) {
        return (
            <div className="text-center py-12 text-base-content/60">
                <p>Chưa có thương hiệu nào</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                <table className="table">
                    <thead className="bg-blue-100 sticky top-0 z-20">
                        <tr>
                            <th className="font-medium text-neutral text-xs">Tên thương hiệu</th>
                            <th className="font-medium text-neutral text-xs">Mô tả</th>
                            <th className="font-medium text-neutral text-xs">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {brands.map((brand) => (
                            <tr
                                key={brand._id}
                                className="cursor-pointer hover:bg-base-200/60 transition-colors font-light"
                            >
                                <td className="font-medium">{brand.name}</td>
                                <td>{brand.description || '—'}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => onEdit(brand)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-xs text-error"
                                            onClick={() => onDelete(brand._id)}
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const BrandManagementPage = () => {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const res = await getBrands();
            if (res.success) {
                setBrands(res.data.brands || []);
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
            toast.error('Lỗi khi tải danh sách thương hiệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const handleCreate = () => {
        setEditingBrand(null);
        setShowModal(true);
    };

    const handleEdit = (brand) => {
        setEditingBrand(brand);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa thương hiệu này?')) return;
        try {
            await deleteBrand(id);
            toast.success('Xóa thương hiệu thành công');
            setShowModal(false);
            setEditingBrand(null);
            fetchBrands();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi xóa thương hiệu');
        }
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingBrand) {
                await updateBrand(editingBrand._id, formData);
                toast.success('Cập nhật thương hiệu thành công');
            } else {
                await createBrand(formData);
                toast.success('Tạo thương hiệu thành công');
            }
            setShowModal(false);
            fetchBrands();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi lưu thương hiệu');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredBrands = brands.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 p-6 bg-base-200 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Quản lý Thương hiệu</h1>
                </div>
                <button onClick={handleCreate} className="btn btn-primary gap-2">
                    <Plus className="w-5 h-5" />
                    Thêm thương hiệu
                </button>
            </div>

            <div className="bg-base-100 rounded-lg shadow p-6">
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm thương hiệu..."
                            className="input input-bordered w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <BrandTable
                    brands={filteredBrands}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            {showModal && (
                <BrandModal
                    brand={editingBrand}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                    onDelete={editingBrand ? () => handleDelete(editingBrand._id) : undefined}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

export default BrandManagementPage;
