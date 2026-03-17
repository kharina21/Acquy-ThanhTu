import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const SupplierModal = ({ supplier, onClose, onSubmit, submitting }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        note: '',
        isActive: true,
    });
    const [errors, setErrors] = useState({});

    const isEdit = supplier?._id && !supplier._nextCode;

    useEffect(() => {
        if (supplier?._id && !supplier._nextCode) {
            setFormData({
                code: supplier.code || '',
                name: supplier.name || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                note: supplier.note || '',
                isActive: supplier.isActive !== false,
            });
        } else if (supplier?._nextCode) {
            setFormData({
                code: supplier._nextCode,
                name: '',
                phone: '',
                email: '',
                address: '',
                note: '',
                isActive: true,
            });
        } else {
            setFormData({
                code: '',
                name: '',
                phone: '',
                email: '',
                address: '',
                note: '',
                isActive: true,
            });
        }
        setErrors({});
    }, [supplier]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'number' ? (parseFloat(value) || 0) : value,
        }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Tên nhà cung cấp là bắt buộc';
        if (!isEdit && !formData.code.trim()) newErrors.code = 'Mã nhà cung cấp là bắt buộc';
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] pt-10 overflow-y-auto">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-lg p-6 my-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">
                        {isEdit ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEdit && (
                        <div>
                            <label className="label">
                                <span className="label-text">Mã nhà cung cấp *</span>
                            </label>
                            <input
                                type="text"
                                name="code"
                                className={`input input-bordered w-full ${errors.code ? 'input-error' : ''}`}
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="NCC-001"
                            />
                            {errors.code && <p className="text-error text-sm mt-1">{errors.code}</p>}
                        </div>
                    )}

                    <div>
                        <label className="label">
                            <span className="label-text">Tên nhà cung cấp *</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên nhà cung cấp"
                        />
                        {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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
                                placeholder="0912345678"
                            />
                        </div>
                        <div>
                            <label className="label">
                                <span className="label-text">Email</span>
                            </label>
                            <input
                                type="email"
                                name="email"
                                className="input input-bordered w-full"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                            />
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
                            placeholder="Địa chỉ nhà cung cấp"
                        />
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text">Ghi chú</span>
                        </label>
                        <textarea
                            name="note"
                            className="textarea textarea-bordered w-full"
                            value={formData.note}
                            onChange={handleChange}
                            placeholder="Ghi chú"
                            rows={2}
                        />
                    </div>

                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-2">
                            <input
                                type="checkbox"
                                name="isActive"
                                className="checkbox checkbox-sm"
                                checked={formData.isActive}
                                onChange={handleChange}
                            />
                            <span className="label-text">Đang hoạt động</span>
                        </label>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
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
                </form>
            </div>
        </div>
    );
};

export default SupplierModal;
