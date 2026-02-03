import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const BranchModal = ({ branch, onClose, onSubmit, submitting }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        address: '',
        phone: '',
        isActive: true,
        note: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (branch) {
            setFormData({
                code: branch.code || '',
                name: branch.name || '',
                address: branch.address || '',
                phone: branch.phone || '',
                isActive: branch.isActive !== false,
                note: branch.note || '',
            });
        } else {
            setFormData({
                code: '',
                name: '',
                address: '',
                phone: '',
                isActive: true,
                note: '',
            });
        }
        setErrors({});
    }, [branch]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.code.trim()) newErrors.code = 'Mã chi nhánh là bắt buộc';
        if (!formData.name.trim()) newErrors.name = 'Tên chi nhánh là bắt buộc';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] pt-10">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                        {branch ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh mới'}
                    </h2>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle" aria-label="Đóng">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">
                                <span className="label-text">Mã chi nhánh *</span>
                            </label>
                            <input
                                type="text"
                                name="code"
                                className={`input input-bordered w-full ${errors.code ? 'input-error' : ''}`}
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="VD: CN01"
                            />
                            {errors.code && <p className="text-error text-sm mt-1">{errors.code}</p>}
                        </div>
                        <div>
                            <label className="label">
                                <span className="label-text">Tên chi nhánh *</span>
                            </label>
                            <input
                                type="text"
                                name="name"
                                className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="VD: Cơ sở 1"
                            />
                            {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Địa chỉ</span>
                        </label>
                        <input
                            type="text"
                            name="address"
                            className="input input-bordered w-full"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Địa chỉ chi nhánh"
                        />
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Số điện thoại</span>
                        </label>
                        <input
                            type="text"
                            name="phone"
                            className="input input-bordered w-full"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Số điện thoại"
                        />
                    </div>
                    <div>
                        <label className="label">
                            <span className="label-text">Ghi chú</span>
                        </label>
                        <textarea
                            name="note"
                            className="textarea textarea-bordered w-full"
                            rows={2}
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="Ghi chú"
                        />
                    </div>
                    <div className="label cursor-pointer justify-start gap-2">
                        <input
                            type="checkbox"
                            name="isActive"
                            className="checkbox checkbox-sm"
                            checked={formData.isActive}
                            onChange={handleChange}
                        />
                        <span className="label-text">Đang hoạt động</span>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            Hủy
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className="loading loading-spinner loading-sm" />
                                    Đang lưu...
                                </>
                            ) : (
                                branch ? 'Cập nhật' : 'Thêm chi nhánh'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BranchModal;
