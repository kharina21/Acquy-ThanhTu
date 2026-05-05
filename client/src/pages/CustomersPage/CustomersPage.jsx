import { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, restoreCustomer } from '@/services/customerService';
import { getMemberPolicies } from '@/services/memberPolicyService';
import { toast } from 'sonner';
import { Plus, Search, Users } from 'lucide-react';
import CustomerTable from './CustomerTable';
import CustomerModal from './CustomerModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { FilterToolbar, FilterToolbarField } from '@/components/common/FilterToolbar';

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
        <div className='flex-1 min-h-0 overflow-y-auto bg-base-200/50'>
            <div className='mx-auto w-full max-w-[min(100%,1280px)] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8'>
                <header className='rounded-2xl border border-base-300/60 bg-base-100 p-5 shadow-sm ring-1 ring-black/3 sm:p-6'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='flex min-w-0 gap-4'>
                            <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20'>
                                <Users className='size-6' aria-hidden />
                            </span>
                            <div>
                                <h1 className='text-2xl font-bold tracking-tight text-base-content sm:text-3xl'>Khách hàng</h1>
                                <p className='mt-1.5 max-w-xl text-sm leading-relaxed text-base-content/65'>
                                    Quản lý danh bạ, hạng thành viên và tài khoản liên kết — tìm nhanh theo tên hoặc số điện thoại.
                                </p>
                            </div>
                        </div>
                        <button
                            type='button'
                            onClick={handleCreate}
                            className='btn btn-primary shrink-0 gap-2 rounded-xl px-5 shadow-sm sm:btn-md'
                        >
                            <Plus className='size-5' />
                            Thêm khách hàng
                        </button>
                    </div>
                </header>

                <div className='rounded-2xl border border-base-300/60 bg-base-100 p-4 shadow-sm ring-1 ring-black/3 sm:p-5'>
                    <FilterToolbar className='gap-x-4 gap-y-3'>
                        <FilterToolbarField label='Tìm kiếm' className='min-w-[200px] flex-1'>
                            <div className='relative max-w-md'>
                                <Search className='pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-base-content/40' />
                                <input
                                    type='text'
                                    placeholder='Tên, SĐT...'
                                    className='input input-bordered input-sm h-10 w-full min-w-0 rounded-xl border-base-300/80 pl-10 sm:h-11'
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPagination((p) => ({ ...p, page: 1 }));
                                    }}
                                />
                            </div>
                        </FilterToolbarField>
                        <FilterToolbarField label='Loại khách'>
                            <select
                                className='select select-bordered select-sm h-10 min-w-[11rem] rounded-xl border-base-300/80 sm:h-11'
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    setPagination((p) => ({ ...p, page: 1 }));
                                }}
                            >
                                <option value=''>Tất cả loại</option>
                                <option value='walkin'>Khách vãng lai</option>
                                <option value='retail'>Khách lẻ</option>
                                <option value='registered'>Liên kết tài khoản</option>
                            </select>
                        </FilterToolbarField>
                    </FilterToolbar>
                </div>

                <div className='overflow-hidden rounded-2xl border border-base-300/60 bg-base-100 shadow-sm ring-1 ring-black/3'>
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
