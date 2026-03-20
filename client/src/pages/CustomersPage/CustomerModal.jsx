import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const TYPE_OPTIONS = [
    { value: 'walkin', label: 'Khách vãng lai' },
    { value: 'retail', label: 'Khách lẻ' },
    { value: 'registered', label: 'Liên kết tài khoản' },
];

const CustomerModal = ({ customer, onClose, onSubmit, submitting }) => {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        type: 'retail',
        accumulatedAmount: 0,
    });
    const [errors, setErrors] = useState({});

    const isEdit = !!customer?._id;

    useEffect(() => {
        if (customer?._id) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                type: customer.type || 'retail',
                accumulatedAmount: customer.accumulatedAmount ?? 0,
            });
        } else {
            setFormData({
                name: '',
                phone: '',
                type: 'retail',
                accumulatedAmount: 0,
            });
        }
        setErrors({});
    }, [customer]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'number' ? (parseFloat(value) || 0) : value,
        }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Tên khách hàng là bắt buộc';
        if (formData.type !== 'walkin' && !formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc đối với khách lẻ';
        }
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
                        {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
                    </h2>
                    <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">
                            <span className="label-text">Tên khách hàng *</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Nhập tên khách hàng"
                        />
                        {errors.name && <p className="text-error text-sm mt-1">{errors.name}</p>}
                    </div>

                    <div>
                        <label className="label">
                            <span className="label-text">Loại khách hàng</span>
                        </label>
                        <select
                            name="type"
                            className="select select-bordered w-full"
                            value={formData.type}
                            onChange={handleChange}
                            disabled={isEdit && formData.type === 'registered'}
                        >
                            {TYPE_OPTIONS.filter((o) => isEdit || o.value !== 'registered').map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-sm text-base-content/60 mt-1">
                            Khách vãng lai: không có thông tin. Khách lẻ: có tên, SĐT. Liên kết tài khoản: tự động khi khách đăng ký online trùng SĐT.
                        </p>
                    </div>

                    {formData.type !== 'walkin' && (
                        <div>
                            <label className="label">
                                <span className="label-text">Số điện thoại *</span>
                            </label>
                            <input
                                type="text"
                                name="phone"
                                className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="0912345678"
                            />
                            {errors.phone && <p className="text-error text-sm mt-1">{errors.phone}</p>}
                        </div>
                    )}

                    {isEdit && (
                        <div>
                            <label className="label">
                                <span className="label-text">Số tiền đã tích lũy</span>
                            </label>
                            <input
                                type="number"
                                name="accumulatedAmount"
                                min={0}
                                className="input input-bordered w-full"
                                value={formData.accumulatedAmount}
                                onChange={handleChange}
                                placeholder="0"
                            />
                        </div>
                    )}

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

export default CustomerModal;
