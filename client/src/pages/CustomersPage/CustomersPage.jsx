import { useState, useEffect } from 'react';
import {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    restoreCustomer,
} from '@/services/customerService';
import { getMemberPolicies } from '@/services/memberPolicyService';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import CustomerTable from './CustomerTable';
import CustomerModal from './CustomerModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        variant: 'warning',
    });
    const [memberPolicies, setMemberPolicies] = useState([]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await getCustomers({
                search: search || undefined,
                type: typeFilter || undefined,
                page: pagination.page,
                limit: pagination.limit,
            });
            if (res.success) {
                setCustomers(res.data.customers || []);
                setPagination((p) => ({
                    ...p,
                    ...res.data.pagination,
                    totalPages: Math.max(1, res.data.pagination?.totalPages ?? 1),
                }));
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Lỗi khi tải danh sách khách hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [search, typeFilter, pagination.page]);

    useEffect(() => {
        getMemberPolicies()
            .then((res) => {
                const list = res?.data?.policies || [];
                setMemberPolicies(list.sort((a, b) => (a.minTotalSpent ?? 0) - (b.minTotalSpent ?? 0)));
            })
            .catch(() => setMemberPolicies([]));
    }, []);

    const handleCreate = () => {
        setEditingCustomer(null);
        setShowModal(true);
    };

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        const customer = customers.find((c) => c._id === id);
        setConfirmModal({
            isOpen: true,
            title: 'Xóa khách hàng',
            message: `Bạn có chắc chắn muốn xóa khách hàng "${customer?.name}"?`,
            onConfirm: async () => {
                try {
                    const res = await deleteCustomer(id);
                    if (res.success) {
                        toast.success('Xóa khách hàng thành công');
                        fetchCustomers();
                    }
                } catch (error) {
                    toast.error(error?.response?.data?.message || 'Lỗi khi xóa khách hàng');
                }
                setConfirmModal((m) => ({ ...m, isOpen: false }));
            },
            variant: 'danger',
        });
    };

    const handleSubmit = async (formData) => {
        setSubmitting(true);
        try {
            if (editingCustomer?._id) {
                const res = await updateCustomer(editingCustomer._id, formData);
                if (res.success) {
                    toast.success('Cập nhật khách hàng thành công');
                    setShowModal(false);
                    fetchCustomers();
                }
            } else {
                const res = await createCustomer(formData);
                if (res.success) {
                    toast.success('Tạo khách hàng thành công');
                    setShowModal(false);
                    fetchCustomers();
                }
            }
        } catch (error) {
            const data = error?.response?.data;
            if (error?.response?.status === 409 && data?.code === 'CUSTOMER_SOFT_DELETED') {
                setConfirmModal({
                    isOpen: true,
                    title: 'Khách hàng đã bị xóa',
                    message: data?.message || 'Khách hàng này đã bị xóa. Bạn có muốn thêm lại?',
                    onConfirm: async () => {
                        try {
                            const res = await restoreCustomer(data.customerId);
                            if (res.success) {
                                toast.success('Đã khôi phục khách hàng');
                                setShowModal(false);
                                fetchCustomers();
                            }
                        } catch (e) {
                            toast.error(e?.response?.data?.message || 'Lỗi khi khôi phục');
                        }
                        setConfirmModal((m) => ({ ...m, isOpen: false }));
                    },
                    variant: 'warning',
                });
            } else {
                toast.error(data?.message || 'Lỗi khi lưu khách hàng');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex-1 min-h-0 p-6 bg-base-200 overflow-y-auto">
            <div className="container mx-auto space-y-4">
                <h1 className="text-2xl font-bold text-base-content">Khách hàng</h1>

                <div className="flex flex-wrap gap-2 items-center">
                    <div>
                        <label className="label py-0 text-xs">Tìm kiếm</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/40 z-10" />
                            <input
                                type="text"
                                placeholder="Tên, SĐT..."
                                className="input input-bordered input-sm w-48 pl-10"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label py-0 text-xs">Loại khách</label>
                        <select
                            className="select select-bordered select-sm w-40"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                        >
                            <option value="">Tất cả loại</option>
                            <option value="walkin">Khách vãng lai</option>
                            <option value="retail">Khách lẻ</option>
                            <option value="registered">Liên kết tài khoản</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button onClick={handleCreate} className="btn btn-primary btn-sm gap-1">
                            <Plus className="w-4 h-4" />
                            Thêm khách hàng
                        </button>
                    </div>
                </div>

                <div className="bg-base-100 rounded-lg shadow-lg">
                    <CustomerTable
                        customers={customers}
                        loading={loading}
                        pagination={pagination}
                        setPagination={setPagination}
                        memberPolicies={memberPolicies}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>

                {showModal && (
                    <CustomerModal
                        customer={editingCustomer}
                        onClose={() => setShowModal(false)}
                        onSubmit={handleSubmit}
                        submitting={submitting}
                    />
                )}

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm || (() => {})}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                />
            </div>
        </div>
    );
};

export default CustomersPage;
