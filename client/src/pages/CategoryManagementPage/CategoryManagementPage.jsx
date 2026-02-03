import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/categoryService';
import { toast } from 'sonner';
import { Package, Plus, Search } from 'lucide-react';
import CategoryTable from './CategoryTable';
import CategoryModal from './CategoryModal';

const CategoryManagementPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await getCategories();
            if (res.success) {
                setCategories(res.data.categories || []);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Lỗi khi tải danh sách loại hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleCreate = () => {
        setEditingCategory(null);
        setShowModal(true);
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa loại hàng này?')) {
            return;
        }

        try {
            const res = await deleteCategory(id);
            if (res.success) {
                toast.success('Xóa loại hàng thành công');
                fetchCategories();
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi xóa loại hàng');
        }
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingCategory) {
                const res = await updateCategory(editingCategory._id, formData);
                if (res.success) {
                    toast.success('Cập nhật loại hàng thành công');
                    setShowModal(false);
                    fetchCategories();
                }
            } else {
                const res = await createCategory(formData);
                if (res.success) {
                    toast.success('Tạo loại hàng thành công');
                    setShowModal(false);
                    fetchCategories();
                }
            }
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error(error.response?.data?.message || 'Lỗi khi lưu loại hàng');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Package className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl font-bold">Quản lý Loại hàng</h1>
                </div>
                <button onClick={handleCreate} className="btn btn-primary gap-2">
                    <Plus className="w-5 h-5" />
                    Thêm loại hàng
                </button>
            </div>

            <div className="bg-base-100 rounded-lg shadow p-6">
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm loại hàng..."
                            className="input input-bordered w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <CategoryTable
                    categories={filteredCategories}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            {showModal && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                />
            )}
        </div>
    );
};

export default CategoryManagementPage;

