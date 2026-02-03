import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BrandModal = ({ brand, onClose, onSubmit, onDelete, submitting }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name || '',
                description: brand.description || '',
            });
        } else {
            setFormData({
                name: '',
                description: '',
            });
        }
        setErrors({});
    }, [brand]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Tên thương hiệu là bắt buộc';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-9999 pt-10">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">
                        {brand ? 'Chỉnh sửa thương hiệu' : 'Thêm thương hiệu mới'}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text">Tên thương hiệu *</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên thương hiệu"
                        />
                        {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text">Mô tả</span>
                        </label>
                        <textarea
                            name="description"
                            className="textarea textarea-bordered w-full"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Nhập mô tả (tùy chọn)"
                            rows={3}
                        />
                    </div>

                    <div className="flex gap-3 justify-between pt-4">
                        {brand && onDelete ? (
                            <button
                                type="button"
                                className="btn btn-error btn-outline"
                                disabled={submitting}
                                onClick={onDelete}
                            >
                                Xóa
                            </button>
                        ) : (
                            <span />
                        )}

                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={submitting}>
                                Hủy
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <span className="loading loading-spinner loading-sm"></span>
                                        Đang lưu...
                                    </>
                                ) : (
                                    'Lưu'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BrandModal;

