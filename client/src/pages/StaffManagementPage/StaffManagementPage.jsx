import React, { useEffect, useState } from 'react';
import Header from '../UserManagementPage/Header';
import {
    getEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeMonthlySalesReport,
} from '@/services/employeeService';
import { getLocations } from '@/services/locationService';
import { getUsers, updateUser, resetUserPassword } from '@/services/userService';
import { toast } from 'sonner';
import { Plus, ChevronRight, ChevronLeft, ChevronDown, User, UserCircle, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import ConfirmationModal from '@/components/common/ConfirmationModal';

const StaffManagementPage = () => {

    const [employees, setEmployees] = useState([]);
    const [locations, setLocations] = useState([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        status: '',
        locationId: '',
    });
    const [salesFilter, setSalesFilter] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });
    const [salesSummary, setSalesSummary] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        employeeCount: 0,
    });
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [expandedEmpForm, setExpandedEmpForm] = useState({ empCode: '', hireDate: '', locations: [], note: '', isActive: true });
    const [expandedUserForm, setExpandedUserForm] = useState({ firstName: '', lastName: '', username: '', email: '' });
    const [savingEmp, setSavingEmp] = useState(false);
    const [savingUser, setSavingUser] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [expandedTab, setExpandedTab] = useState('info');
    const [editingInfo, setEditingInfo] = useState(false);
    const [editingAccount, setEditingAccount] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, title: '', message: '', variant: 'warning', confirmText: 'Xác nhận' });
    const [formData, setFormData] = useState({
        hireDate: '',
        locations: [],
        note: '',
        isActive: true,
    });
    const [staffUsers, setStaffUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [staffSelectOpen, setStaffSelectOpen] = useState(false);

    const fetchLocations = async () => {
        try {
            const res = await getLocations({ page: 1, limit: 1000 });
            if (res.success) {
                setLocations(res.data.locations || []);
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    };

    const fetchStaffUsers = async () => {
        try {
            // Lấy tất cả người dùng trừ "Người dùng thường" và "admin"
            const res = await getUsers({
                limit: 1000,
                excludeRoles: ['Người dùng thường', 'admin'],
            });
            if (res.success) {
                setStaffUsers(res.data.users || []);
            }
        } catch (error) {
            console.error('Error fetching staff users:', error);
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };
            Object.keys(params).forEach((k) => {
                if (!params[k]) delete params[k];
            });
            const res = await getEmployees(params);
            if (res.success) {
                setEmployees(res.data.employees || []);
                setPagination(res.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error(error.response?.data?.message || 'Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployeeSales = async () => {
        try {
            const params = {
                month: salesFilter.month,
                year: salesFilter.year,
            };
            if (filters.locationId) params.locationId = filters.locationId;
            const res = await getEmployeeMonthlySalesReport(params);
            if (res.success) {
                const rows = res?.data?.employees || [];
                const salesMap = new Map(rows.map((row) => [row._id, row.sales || { revenue: 0, orderCount: 0, avgOrderValue: 0 }]));
                setEmployees((prev) =>
                    prev.map((emp) => ({
                        ...emp,
                        sales: salesMap.get(emp._id) || { revenue: 0, orderCount: 0, avgOrderValue: 0 },
                    }))
                );
                setSalesSummary(
                    res?.data?.summary || {
                        totalRevenue: 0,
                        totalOrders: 0,
                        employeeCount: rows.length,
                    }
                );
            }
        } catch (error) {
            console.error('Error fetching employee sales:', error);
            toast.error(error.response?.data?.message || 'Không thể tải doanh thu theo nhân viên');
        }
    };

    useEffect(() => {
        fetchLocations();
        fetchStaffUsers();
    }, []);

    useEffect(() => {
        fetchEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, filters.status, filters.locationId]);

    useEffect(() => {
        if (employees.length > 0) {
            fetchEmployeeSales();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employees.length, salesFilter.month, salesFilter.year, filters.locationId]);

    const openCreateModal = () => {
        setEditingEmployee(null);
        setFormData({
            empCode: '',
            hireDate: '',
            locations: [],
            note: '',
            isActive: true,
        });
        setSelectedUserId('');
        setStaffSelectOpen(false);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!formData.locations || formData.locations.length === 0) {
                toast.error('Vui lòng chọn ít nhất một chi nhánh làm việc');
                return;
            }

            const payload = {
                empCode: (formData.empCode || '').trim() || undefined,
                hireDate: formData.hireDate || null,
                locations: formData.locations,
                note: formData.note,
                isActive: formData.isActive,
            };

            if (editingEmployee) {
                const res = await updateEmployee(editingEmployee._id, payload);
                if (res.success) {
                    toast.success('Cập nhật hồ sơ nhân viên thành công');
                }
            } else {
                if (!selectedUserId) {
                    toast.error('Vui lòng chọn tài khoản nhân viên');
                    return;
                }
                const createPayload = {
                    userId: selectedUserId,
                    empCode: payload.empCode || undefined,
                    hireDate: payload.hireDate,
                    locations: payload.locations,
                    note: payload.note,
                    isActive: payload.isActive,
                };
                const res = await createEmployee(createPayload);
                if (res.success) {
                    toast.success('Tạo hồ sơ nhân viên thành công');
                }
            }

            setShowModal(false);
            setEditingEmployee(null);
            fetchEmployees();
            fetchStaffUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lưu hồ sơ nhân viên thất bại');
        }
    };

    const formatDate = (value) => {
        if (!value) return '-';
        try {
            return new Date(value).toLocaleDateString('vi-VN');
        } catch {
            return '-';
        }
    };

    const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setPagination((prev) => ({ ...prev, page: newPage }));
    };

    // Những tài khoản nhân viên chưa có hồ sơ Employee
    // Lấy tất cả tài khoản nhân viên trừ các role "user" và "admin", và chưa có hồ sơ Employee
    const availableStaffUsers = staffUsers.filter(
        (u) =>
            !employees.some((emp) => emp.user && emp.user._id === u._id) &&
            Array.isArray(u.roles) &&
            u.roles.every(
                (r) => r.name !== 'Người dùng thường' && r.name !== 'admin'
            )
    );

    const toggleLocationSelection = (locationId) => {
        setFormData((prev) => {
            const exists = prev.locations.includes(locationId);
            return {
                ...prev,
                locations: exists
                    ? prev.locations.filter((id) => id !== locationId)
                    : [...prev.locations, locationId],
            };
        });
    };

    const toggleExpandedLocation = (locationId) => {
        setExpandedEmpForm((prev) => {
            const exists = prev.locations.includes(locationId);
            return {
                ...prev,
                locations: exists
                    ? prev.locations.filter((id) => id !== locationId)
                    : [...prev.locations, locationId],
            };
        });
    };

    const toggleExpand = (emp) => {
        if (expandedId === emp._id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(emp._id);
        setExpandedEmpForm({
            empCode: emp.empCode || '',
            hireDate: emp.hireDate ? String(emp.hireDate).split('T')[0] : '',
            locations: (emp.locations || []).map((l) => (l._id || l)),
            note: emp.note || '',
            isActive: emp.isActive !== false,
        });
        setExpandedUserForm({
            firstName: emp.user?.firstName || '',
            lastName: emp.user?.lastName || '',
            username: emp.user?.username || '',
            email: emp.user?.email || '',
        });
        setExpandedTab('info');
        setEditingInfo(false);
        setEditingAccount(false);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSaveEmpInfo = async (e) => {
        e.preventDefault();
        if (!expandedId) return;
        if (!expandedEmpForm.locations?.length) {
            toast.error('Vui lòng chọn ít nhất một chi nhánh làm việc');
            return;
        }
        setSavingEmp(true);
        try {
            const res = await updateEmployee(expandedId, {
                empCode: (expandedEmpForm.empCode || '').trim() || undefined,
                hireDate: expandedEmpForm.hireDate || null,
                locations: expandedEmpForm.locations,
                note: expandedEmpForm.note,
                isActive: expandedEmpForm.isActive,
            });
            if (res.success) {
                toast.success('Cập nhật thông tin nhân viên thành công');
                setEditingInfo(false);
                fetchEmployees();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setSavingEmp(false);
        }
    };

    const handleSaveUserInfo = async (e) => {
        e.preventDefault();
        const emp = employees.find((e) => e._id === expandedId);
        if (!emp?.user?._id) return;
        setSavingUser(true);
        try {
            const res = await updateUser(emp.user._id, {
                firstName: expandedUserForm.firstName?.trim(),
                lastName: expandedUserForm.lastName?.trim(),
                email: expandedUserForm.email?.trim(),
            });
            if (res.success) {
                toast.success('Cập nhật tài khoản thành công');
                setEditingAccount(false);
                fetchEmployees();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setSavingUser(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        const emp = employees.find((x) => x._id === expandedId);
        if (!emp?.user?._id) return;
        if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Xác nhận mật khẩu không khớp');
            return;
        }
        setSavingPassword(true);
        try {
            const res = await resetUserPassword(emp.user._id, passwordForm.newPassword);
            if (res.success) {
                toast.success('Đổi mật khẩu thành công');
                setPasswordForm({ newPassword: '', confirmPassword: '' });
                setShowNewPassword(false);
                setShowConfirmPassword(false);
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Đổi mật khẩu thất bại');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleDeleteEmployee = (emp) => {
        setConfirmModal({
            isOpen: true,
            title: 'Xóa hồ sơ nhân viên',
            message: `Xóa hồ sơ nhân viên "${emp.user?.firstName || ''} ${emp.user?.lastName || ''}"? Hành động này không thể hoàn tác.`,
            variant: 'danger',
            confirmText: 'Xóa',
            onConfirm: async () => {
                try {
                    const res = await deleteEmployee(emp._id);
                    if (res.success) {
                        toast.success('Xóa hồ sơ nhân viên thành công');
                        setExpandedId(null);
                        setExpandedEmpForm({ empCode: '', hireDate: '', locations: [], note: '', isActive: true });
                        setExpandedUserForm({ firstName: '', lastName: '', username: '', email: '' });
                        setEditingInfo(false);
                        setEditingAccount(false);
                        fetchEmployees();
                    }
                } catch (err) {
                    toast.error(err?.response?.data?.message || 'Xóa thất bại');
                }
            },
        });
    };

    return (
        <div className="flex-1 px-6 py-8 bg-base-200 overflow-y-auto">
            <div className="space-y-4">
                <h1 className="text-2xl font-bold">Danh sách nhân viên</h1>

                <div className="space-y-4">
                        {/* Bộ lọc + nút tạo hồ sơ */}
                        <div className="bg-base-100 rounded-lg shadow-lg p-4 flex flex-wrap gap-4 items-end justify-between">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className='flex flex-col'>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Trạng thái</span>
                                    </label>
                                    <select
                                        className="select select-sm w-40 focus:outline-none focus:ring-0"
                                        value={filters.status}
                                        onChange={(e) => {
                                            setFilters((prev) => ({ ...prev, status: e.target.value }));
                                            setPagination((prev) => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        <option value="">Tất cả</option>
                                        <option value="active">Đang làm</option>
                                        <option value="inactive">Ngừng làm</option>
                                    </select>
                                </div>
                                <div className='flex flex-col'>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Chi nhánh</span>
                                    </label>
                                    <select
                                        className="select select-sm w-64 focus:outline-none focus:ring-0"
                                        value={filters.locationId}
                                        onChange={(e) => {
                                            setFilters((prev) => ({ ...prev, locationId: e.target.value }));
                                            setPagination((prev) => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        <option value="">Tất cả chi nhánh</option>
                                        {locations.map((loc) => (
                                            <option key={loc._id} value={loc._id}>
                                                {loc.code} - {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className='flex flex-col'>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Tháng</span>
                                    </label>
                                    <select
                                        className="select select-sm w-28 focus:outline-none focus:ring-0"
                                        value={salesFilter.month}
                                        onChange={(e) =>
                                            setSalesFilter((prev) => ({ ...prev, month: Number(e.target.value) || 1 }))
                                        }
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <option key={m} value={m}>
                                                Tháng {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className='flex flex-col'>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Năm</span>
                                    </label>
                                    <input
                                        type="number"
                                        min={2000}
                                        max={3000}
                                        className="input input-sm w-28 focus:outline-none focus:ring-0"
                                        value={salesFilter.year}
                                        onChange={(e) =>
                                            setSalesFilter((prev) => ({ ...prev, year: Number(e.target.value) || new Date().getFullYear() }))
                                        }
                                    />
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm gap-2"
                                    onClick={openCreateModal}
                                >
                                    <Plus className="w-4 h-4" />
                                    Tạo nhân viên
                                </button>
                            </div>
                        </div>
                        <div className="bg-base-100 rounded-lg shadow-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                <div>
                                    <span className="text-base-content/60">Doanh thu tháng</span>
                                    <p className="font-semibold text-primary">{formatMoney(salesSummary.totalRevenue)}</p>
                                </div>
                                <div>
                                    <span className="text-base-content/60">Số đơn đã thanh toán</span>
                                    <p className="font-semibold">{(salesSummary.totalOrders || 0).toLocaleString('vi-VN')}</p>
                                </div>
                                <div>
                                    <span className="text-base-content/60">Nhân viên trong báo cáo</span>
                                    <p className="font-semibold">{(salesSummary.employeeCount || 0).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Bảng nhân viên */}
                        <div className="bg-base-100 rounded-lg shadow-lg">
                            {loading ? (
                                <div className="p-8 text-center text-base-content/60">
                                    Đang tải danh sách nhân viên...
                                </div>
                            ) : employees.length === 0 ? (
                                <div className="p-8 text-center text-base-content/60">
                                    Chưa có hồ sơ nhân viên nào. Bạn cần tạo user nhân viên ở phần người dùng, sau đó gắn
                                    thêm hồ sơ nhân viên tại đây.
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto overflow-y-auto max-h-[700px]">
                                        <table className="table w-full">
                                            <thead className="bg-blue-100 sticky top-0 z-20">
                                                <tr>
                                                    <th className="w-8"></th>
                                                    <th className="font-medium text-neutral text-xs">Mã NV</th>
                                                    <th className="font-medium text-neutral text-xs">Nhân viên</th>
                                                    <th className="font-medium text-neutral text-xs">Chi nhánh làm việc</th>
                                                    <th className="font-medium text-neutral text-xs">Ngày vào làm</th>
                                                    <th className="font-medium text-neutral text-xs">Đơn/tháng</th>
                                                    <th className="font-medium text-neutral text-xs">Doanh thu/tháng</th>
                                                    <th className="font-medium text-neutral text-xs">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-xs">
                                                {employees.map((emp) => {
                                                    const isExpanded = expandedId === emp._id;
                                                    return (
                                                        <React.Fragment key={emp._id}>
                                                            <tr
                                                                className={`hover:bg-base-200/60 transition-colors font-light cursor-pointer ${isExpanded ? 'bg-primary/10' : ''}`}
                                                                onClick={() => toggleExpand(emp)}
                                                            >
                                                                <td className={`w-8 ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}>
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-4 h-4" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <span className="font-mono font-medium">{emp.empCode || '-'}</span>
                                                                </td>
                                                                <td>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold">
                                                                            {emp.user?.firstName} {emp.user?.lastName}
                                                                        </span>
                                                                        <span className="text-base-content/70">
                                                                            {emp.user?.username}
                                                                        </span>
                                                                        <span className="text-base-content/70">
                                                                            {emp.user?.email}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                                        {(emp.locations || []).map((loc) => (
                                                                            <span
                                                                                key={loc._id}
                                                                                className="badge badge-xs badge-outline"
                                                                            >
                                                                                {loc.code} - {loc.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td>{formatDate(emp.hireDate)}</td>
                                                                <td>{(emp.sales?.orderCount || 0).toLocaleString('vi-VN')}</td>
                                                                <td className="font-semibold text-primary">{formatMoney(emp.sales?.revenue || 0)}</td>
                                                                <td>
                                                                    <span
                                                                        className={`badge badge-sm ${emp.isActive ? 'badge-success' : 'badge-neutral'}`}
                                                                    >
                                                                        {emp.isActive ? 'Đang làm' : 'Ngừng làm'}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr className="bg-primary/5">
                                                                    <td colSpan={8} className="p-4 border-l-4 border-l-primary align-top" onClick={(e) => e.stopPropagation()}>
                                                                        {(() => {
                                                                            const expEmp = employees.find((e) => e._id === expandedId);
                                                                            return (
                                                                        <>
                                                                        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    type="button"
                                                                                    className={`btn btn-sm gap-2 ${expandedTab === 'info' ? 'btn-primary' : 'btn-ghost'}`}
                                                                                    onClick={() => { setExpandedTab('info'); setEditingInfo(false); }}
                                                                                >
                                                                                    <UserCircle className="w-4 h-4" />
                                                                                    Thông tin nhân viên
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className={`btn btn-sm gap-2 ${expandedTab === 'account' ? 'btn-primary' : 'btn-ghost'}`}
                                                                                    onClick={() => { setExpandedTab('account'); setEditingAccount(false); }}
                                                                                >
                                                                                    <User className="w-4 h-4" />
                                                                                    Tài khoản
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        {expandedTab === 'info' && (
                                                                            <div className="space-y-4">
                                                                                {!editingInfo ? (
                                                                                    <div className="space-y-3 max-w-xl">
                                                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Mã nhân viên:</span>
                                                                                                <p className="font-medium">{expandedEmpForm.empCode || '—'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Ngày vào làm:</span>
                                                                                                <p className="font-medium">{expandedEmpForm.hireDate ? formatDate(expandedEmpForm.hireDate) : '—'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Trạng thái:</span>
                                                                                                <p className="font-medium">{expandedEmpForm.isActive ? 'Đang làm' : 'Ngừng làm'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Đơn ({salesFilter.month}/{salesFilter.year}):</span>
                                                                                                <p className="font-medium">{(expEmp?.sales?.orderCount || 0).toLocaleString('vi-VN')}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Doanh thu ({salesFilter.month}/{salesFilter.year}):</span>
                                                                                                <p className="font-medium text-primary">{formatMoney(expEmp?.sales?.revenue || 0)}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Chi nhánh:</span>
                                                                                                <p className="font-medium">
                                                                                                    {locations.filter((l) => expandedEmpForm.locations.includes(l._id)).length > 0
                                                                                                        ? locations.filter((l) => expandedEmpForm.locations.includes(l._id)).map((loc) => `${loc.code} - ${loc.name}`).join(', ')
                                                                                                        : '—'}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>
                                                                                        {expandedEmpForm.note && (
                                                                                            <div>
                                                                                                <span className="text-base-content/60 text-sm">Ghi chú:</span>
                                                                                                <p className="text-sm mt-0.5">{expandedEmpForm.note}</p>
                                                                                            </div>
                                                                                        )}
                                                                                        <div className="flex gap-2">
                                                                                            <button type="button" className="btn btn-outline btn-sm gap-2" onClick={() => setEditingInfo(true)}>
                                                                                                <Pencil className="w-4 h-4" />
                                                                                                Chỉnh sửa
                                                                                            </button>
                                                                                            {expEmp && (
                                                                                                <button type="button" className="btn btn-outline btn-error btn-sm gap-2" onClick={() => handleDeleteEmployee(expEmp)}>
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                    Xóa
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                <form onSubmit={handleSaveEmpInfo} className="space-y-4">
                                                                                    <div>
                                                                                        <label className="label">
                                                                                            <span className="label-text font-semibold">Mã nhân viên</span>
                                                                                        </label>
                                                                                        <input
                                                                                            type="text"
                                                                                            className="input input-bordered input-sm w-full"
                                                                                            value={expandedEmpForm.empCode}
                                                                                            onChange={(e) => setExpandedEmpForm((p) => ({ ...p, empCode: e.target.value }))}
                                                                                            maxLength={10}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div>
                                                                                            <label className="label">
                                                                                                <span className="label-text font-semibold">Ngày vào làm</span>
                                                                                            </label>
                                                                                            <input
                                                                                                type="date"
                                                                                                className="input input-bordered input-sm w-full"
                                                                                                value={expandedEmpForm.hireDate}
                                                                                                onChange={(e) => setExpandedEmpForm((p) => ({ ...p, hireDate: e.target.value }))}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="label">
                                                                                                <span className="label-text font-semibold">Trạng thái</span>
                                                                                            </label>
                                                                                            <select
                                                                                                className="select select-bordered select-sm w-full"
                                                                                                value={expandedEmpForm.isActive ? 'true' : 'false'}
                                                                                                onChange={(e) => setExpandedEmpForm((p) => ({ ...p, isActive: e.target.value === 'true' }))}
                                                                                            >
                                                                                                <option value="true">Đang làm</option>
                                                                                                <option value="false">Ngừng làm</option>
                                                                                            </select>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="label">
                                                                                            <span className="label-text font-semibold">Chi nhánh làm việc</span>
                                                                                        </label>
                                                                                        <div className="dropdown dropdown-bottom">
                                                                                            <div tabIndex={0} role="button" className="btn btn-sm btn-ghost w-full justify-between border border-base-300">
                                                                                                <span>Thêm / bớt chi nhánh</span>
                                                                                            </div>
                                                                                            <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box w-full max-h-60 overflow-y-auto border border-base-300 shadow z-10">
                                                                                                {locations.map((loc) => {
                                                                                                    const checked = expandedEmpForm.locations.includes(loc._id);
                                                                                                    return (
                                                                                                        <li key={loc._id}>
                                                                            <label className="flex items-center gap-2 px-2 py-1 cursor-pointer">
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    className="checkbox checkbox-xs"
                                                                                                    checked={checked}
                                                                                                    onChange={() => toggleExpandedLocation(loc._id)}
                                                                                                />
                                                                                                <span className="text-sm">{loc.code} - {loc.name}</span>
                                                                                            </label>
                                                                                                        </li>
                                                                                                    );
                                                                                                })}
                                                                                            </ul>
                                                                                        </div>
                                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                                            {locations.filter((l) => expandedEmpForm.locations.includes(l._id)).map((loc) => (
                                                                                                <span key={loc._id} className="badge badge-sm badge-primary">
                                                                                                    {loc.code} - {loc.name}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <label className="label">
                                                                                            <span className="label-text font-semibold">Ghi chú</span>
                                                                                        </label>
                                                                                        <textarea
                                                                                            className="textarea textarea-bordered w-full textarea-sm"
                                                                                            rows={2}
                                                                                            value={expandedEmpForm.note}
                                                                                            onChange={(e) => setExpandedEmpForm((p) => ({ ...p, note: e.target.value }))}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <button type="submit" className="btn btn-primary btn-sm" disabled={savingEmp}>
                                                                                            {savingEmp ? 'Đang lưu...' : 'Lưu'}
                                                                                        </button>
                                                                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingInfo(false)}>
                                                                                            Hủy
                                                                                        </button>
                                                                                    </div>
                                                                                </form>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {expandedTab === 'account' && (
                                                                            <div className="space-y-6 max-w-xl">
                                                                                {!editingAccount ? (
                                                                                    <div className="space-y-3">
                                                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Họ:</span>
                                                                                                <p className="font-medium">{expandedUserForm.firstName || '—'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Tên:</span>
                                                                                                <p className="font-medium">{expandedUserForm.lastName || '—'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Tên đăng nhập:</span>
                                                                                                <p className="font-medium">{expandedUserForm.username || '—'}</p>
                                                                                            </div>
                                                                                            <div>
                                                                                                <span className="text-base-content/60">Email:</span>
                                                                                                <p className="font-medium">{expandedUserForm.email || '—'}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex gap-2">
                                                                                            <button type="button" className="btn btn-outline btn-sm gap-2" onClick={() => setEditingAccount(true)}>
                                                                                                <Pencil className="w-4 h-4" />
                                                                                                Chỉnh sửa
                                                                                            </button>
                                                                                            {expEmp && (
                                                                                                <button type="button" className="btn btn-outline btn-error btn-sm gap-2" onClick={() => handleDeleteEmployee(expEmp)}>
                                                                                                    <Trash2 className="w-4 h-4" />
                                                                                                    Xóa
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                <div className="space-y-6">
                                                                                <form onSubmit={handleSaveUserInfo} className="space-y-4">
                                                                                    <div className="text-sm font-semibold text-base-content/80 mb-2">Thông tin cơ bản</div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Họ</span>
                                                                                            </label>
                                                                                            <input
                                                                                                type="text"
                                                                                                className="input input-bordered input-sm w-full"
                                                                                                value={expandedUserForm.firstName}
                                                                                                onChange={(e) => setExpandedUserForm((p) => ({ ...p, firstName: e.target.value }))}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Tên</span>
                                                                                            </label>
                                                                                            <input
                                                                                                type="text"
                                                                                                className="input input-bordered input-sm w-full"
                                                                                                value={expandedUserForm.lastName}
                                                                                                onChange={(e) => setExpandedUserForm((p) => ({ ...p, lastName: e.target.value }))}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Tên đăng nhập</span>
                                                                                            </label>
                                                                                            <input
                                                                                                type="text"
                                                                                                className="input input-bordered input-sm w-full bg-base-200"
                                                                                                value={expandedUserForm.username}
                                                                                                readOnly
                                                                                                title="Tên đăng nhập không thể thay đổi"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Email</span>
                                                                                            </label>
                                                                                            <input
                                                                                                type="email"
                                                                                                className="input input-bordered input-sm w-full"
                                                                                                value={expandedUserForm.email}
                                                                                                onChange={(e) => setExpandedUserForm((p) => ({ ...p, email: e.target.value }))}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex gap-2">
                                                                                        <button type="submit" className="btn btn-primary btn-sm" disabled={savingUser}>
                                                                                            {savingUser ? 'Đang lưu...' : 'Lưu'}
                                                                                        </button>
                                                                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingAccount(false)}>
                                                                                            Hủy
                                                                                        </button>
                                                                                    </div>
                                                                                </form>
                                                                                <div className="divider my-2"></div>
                                                                                <form onSubmit={handleChangePassword} className="space-y-4">
                                                                                    <div className="text-sm font-semibold text-base-content/80 mb-2">Đổi mật khẩu</div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Mật khẩu mới</span>
                                                                                            </label>
                                                                                            <div className="relative">
                                                                                                <input
                                                                                                    type={showNewPassword ? 'text' : 'password'}
                                                                                                    className="input input-bordered input-sm w-full pr-10"
                                                                                                    value={passwordForm.newPassword}
                                                                                                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                                                                                                    placeholder="Ít nhất 6 ký tự"
                                                                                                    autoComplete="new-password"
                                                                                                />
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
                                                                                                    onClick={() => setShowNewPassword((p) => !p)}
                                                                                                    tabIndex={-1}
                                                                                                    aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                                                                >
                                                                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="label py-0">
                                                                                                <span className="label-text text-xs">Xác nhận mật khẩu</span>
                                                                                            </label>
                                                                                            <div className="relative">
                                                                                                <input
                                                                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                                                                    className="input input-bordered input-sm w-full pr-10"
                                                                                                    value={passwordForm.confirmPassword}
                                                                                                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                                                                                    placeholder="Nhập lại mật khẩu"
                                                                                                    autoComplete="new-password"
                                                                                                />
                                                                                                <button
                                                                                                    type="button"
                                                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-square"
                                                                                                    onClick={() => setShowConfirmPassword((p) => !p)}
                                                                                                    tabIndex={-1}
                                                                                                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                                                                                >
                                                                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <button type="submit" className="btn btn-outline btn-sm" disabled={savingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}>
                                                                                        {savingPassword ? 'Đang lưu...' : 'Đổi mật khẩu'}
                                                                                    </button>
                                                                                </form>
                                                                                </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        </>
                                                                    );
                                                                })()}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Phân trang */}
                                    <div className="flex justify-between items-center p-4 border-t border-base-200">
                                        <div>
                                            <p className="text-sm text-base-content/60">
                                                Hiển thị {employees.length} / {pagination.total} nhân viên
                                            </p>
                                        </div>
                                        <div className="join">
                                            <button
                                                type="button"
                                                className="join-item btn btn-sm"
                                                disabled={pagination.page <= 1}
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                aria-label="Trang trước"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                className="join-item btn btn-sm"
                                                disabled={pagination.page >= pagination.totalPages}
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                aria-label="Trang sau"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                {/* Modal chỉnh sửa hồ sơ nhân viên */}
                {showModal && (
                    <dialog className="modal modal-open">
                        <div className="modal-box max-w-3xl">
                            <h3 className="font-bold text-lg mb-4">
                                {editingEmployee ? 'Chỉnh sửa hồ sơ nhân viên' : 'Tạo hồ sơ nhân viên'}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {editingEmployee ? (
                                    <div className="p-3 rounded bg-base-200 text-sm">
                                        <div className="font-semibold">
                                            {editingEmployee.user?.firstName} {editingEmployee.user?.lastName}
                                        </div>
                                        <div className="text-xs text-base-content/70">
                                            {editingEmployee.user?.username} • {editingEmployee.user?.email}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    Chọn tài khoản nhân viên <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <button
                                                type="button"
                                                className="input input-bordered input-sm w-full text-left flex items-center justify-between"
                                                onClick={() => setStaffSelectOpen((v) => !v)}
                                                aria-expanded={staffSelectOpen}
                                                aria-haspopup="listbox"
                                            >
                                                <span>
                                                    {selectedUserId
                                                        ? (() => {
                                                            const u = availableStaffUsers.find((x) => x._id === selectedUserId);
                                                            return u
                                                                ? [u.empCode, `${(u.firstName || '')} ${(u.lastName || '')}`.trim(), u.roles?.[0]?.name].filter(Boolean).join(' · ')
                                                                : '-- Chọn nhân viên --';
                                                        })()
                                                        : '-- Chọn nhân viên --'}
                                                </span>
                                                <span className="text-base-content/50">{staffSelectOpen ? '▼' : '▶'}</span>
                                            </button>
                                            {staffSelectOpen && (
                                                <>
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        aria-hidden="true"
                                                        onClick={() => setStaffSelectOpen(false)}
                                                    />
                                                    <div className="absolute z-20 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto animate-slide-down">
                                                        <table className="table table-xs">
                                                            <thead className="bg-base-200 sticky top-0">
                                                                <tr>
                                                                    <th className="font-semibold">Mã NV</th>
                                                                    <th className="font-semibold">Họ tên</th>
                                                                    <th className="font-semibold">Vai trò</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {availableStaffUsers.map((u) => (
                                                                    <tr
                                                                        key={u._id}
                                                                        className={`cursor-pointer hover:bg-primary/10 ${selectedUserId === u._id ? 'bg-primary/10' : ''}`}
                                                                        onClick={() => {
                                                                            setSelectedUserId(u._id);
                                                                            setFormData((prev) => ({
                                                                                ...prev,
                                                                                empCode: u.empCode || '',
                                                                            }));
                                                                            setStaffSelectOpen(false);
                                                                        }}
                                                                    >
                                                                        <td className="font-mono">{u.empCode || '-'}</td>
                                                                        <td>{`${(u.firstName || '')} ${(u.lastName || '')}`.trim() || '-'}</td>
                                                                        <td>{u.roles?.[0]?.name || '-'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {availableStaffUsers.length === 0 && (
                                                            <div className="p-4 text-center text-base-content/60 text-sm">Không có tài khoản nhân viên nào để chọn</div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">Mã nhân viên</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="input input-bordered input-sm w-full"
                                                placeholder="Mã tự động"
                                                value={formData.empCode}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({ ...prev, empCode: e.target.value }))
                                                }
                                                maxLength={10}
                                            />
                                            <span className="label-text-alt text-base-content/60">
                                                Dạng NV + 5 chữ số (vd: NV00001)
                                            </span>
                                        </div>
                                    </>
                                )}
                                {editingEmployee && (
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Mã nhân viên</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            placeholder="NV00001"
                                            value={formData.empCode}
                                            onChange={(e) =>
                                                setFormData((prev) => ({ ...prev, empCode: e.target.value }))
                                            }
                                            maxLength={10}
                                        />
                                        <span className="label-text-alt text-base-content/60">
                                            Dạng NV + 5 chữ số (vd: NV00001)
                                        </span>
                                    </div>
                                )}
                                {/* Bỏ input kiểu lương và lương cơ bản */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Ngày vào làm</span>
                                        </label>
                                        <input
                                            type="date"
                                            className="input input-bordered input-sm w-full"
                                            value={formData.hireDate}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    hireDate: e.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Trạng thái</span>
                                        </label>
                                        <select
                                            className="select select-bordered select-sm w-full"
                                            value={formData.isActive ? 'true' : 'false'}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isActive: e.target.value === 'true',
                                                }))
                                            }
                                        >
                                            <option value="true">Đang làm</option>
                                            <option value="false">Ngừng làm</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Chi nhánh làm việc</span>
                                        </label>
                                        <div className="border border-base-300 rounded-lg px-2 py-1 min-h-[40px] flex flex-wrap gap-1 bg-base-100">
                                            {formData.locations.length === 0 ? (
                                                <span className="text-xs text-base-content/50">
                                                    Chọn chi nhánh làm việc...
                                                </span>
                                            ) : (
                                                locations
                                                    .filter((loc) => formData.locations.includes(loc._id))
                                                    .map((loc) => (
                                                        <span
                                                            key={loc._id}
                                                            className="badge badge-sm badge-primary gap-1 cursor-default"
                                                        >
                                                            {loc.code || ''} {loc.name}
                                                        </span>
                                                    ))
                                            )}
                                        </div>
                                        <div className="mt-2 dropdown dropdown-bottom w-full">
                                            <div
                                                tabIndex={0}
                                                role="button"
                                                className="btn btn-sm btn-ghost w-full justify-between"
                                            >
                                                <span>Thêm / bớt chi nhánh</span>
                                            </div>
                                            <ul
                                                tabIndex={-1}
                                                className="dropdown-content menu bg-base-100 rounded-box w-full max-h-60 overflow-y-auto border border-base-300 shadow"
                                            >
                                                {locations.map((loc) => {
                                                    const checked = formData.locations.includes(loc._id);
                                                    return (
                                                        <li key={loc._id}>
                                                            <label className="flex items-center gap-2 px-2 py-1 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="checkbox checkbox-xs"
                                                                    checked={checked}
                                                                    onChange={() => toggleLocationSelection(loc._id)}
                                                                />
                                                                <span className="text-sm">
                                                                    {loc.code} - {loc.name}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Ghi chú</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        rows={3}
                                        value={formData.note}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                note: e.target.value,
                                            }))
                                        }
                                    />
                                </div>
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setShowModal(false);
                                            setEditingEmployee(null);
                                        }}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm">
                                        {editingEmployee ? 'Lưu' : 'Tạo nhân viên'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <form method="dialog" className="modal-backdrop">
                            <button type="button" onClick={() => setShowModal(false)}>
                                Đóng
                            </button>
                        </form>
                    </dialog>
                )}


                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    variant={confirmModal.variant}
                    confirmText={confirmModal.confirmText}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal((p) => ({ ...p, isOpen: false }))}
                />
            </div>
        </div >
    );
};

export default StaffManagementPage;

