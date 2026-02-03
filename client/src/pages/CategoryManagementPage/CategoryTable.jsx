import { Pencil, Trash2 } from 'lucide-react';

const CategoryTable = ({ categories, loading, onEdit, onDelete }) => {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (categories.length === 0) {
        return (
            <div className="text-center py-12 text-base-content/60">
                <p>Chưa có loại hàng nào</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                <table className="table">
                    <thead className="bg-blue-100 sticky top-0 z-20">
                        <tr>
                            <th className="font-medium text-neutral text-xs">Tên loại hàng</th>
                            <th className="font-medium text-neutral text-xs">Mô tả</th>
                            <th className="font-medium text-neutral text-xs">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {categories.map((category) => (
                            <tr
                                key={category._id}
                                className="cursor-pointer hover:bg-base-200/60 transition-colors font-light"
                            >
                                <td className="font-medium">{category.name}</td>
                                <td>{category.description || '—'}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <button
                                            className="btn btn-ghost btn-xs"
                                            onClick={() => onEdit(category)}
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-xs text-error"
                                            onClick={() => onDelete(category._id)}
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

export default CategoryTable;

