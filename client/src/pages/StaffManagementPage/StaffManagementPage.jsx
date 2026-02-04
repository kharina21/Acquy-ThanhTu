import { useEffect, useState } from 'react';
import Header from '../UserManagementPage/Header';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/services/employeeService';
import { getLocations } from '@/services/locationService';
import { getUsers } from '@/services/userService';
import { getWorkSchedules, createWorkSchedule, updateWorkSchedule, deleteWorkSchedule } from '@/services/workScheduleService';
import { getShifts, createShift, updateShift, deleteShift } from '@/services/shiftService';
import { toast } from 'sonner';
import { Edit, Trash2, Plus, X } from 'lucide-react';

// Helper function để parse time string (HH:mm) thành {hour, minute}
const parseTime = (timeStr) => {
    if (!timeStr) return { hour: '00', minute: '00' };
    const [hour, minute] = timeStr.split(':');
    return { hour: hour || '00', minute: minute || '00' };
};

// Helper function để format {hour, minute} thành time string (HH:mm)
const formatTime = (hour, minute) => {
    const h = String(hour).padStart(2, '0');
    const m = String(minute).padStart(2, '0');
    return `${h}:${m}`;
};

// Generate options cho giờ (00-23)
const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// Generate options cho phút (00, 15, 30, 45)
const minuteOptions = ['00', '15', '30', '45'];

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
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        salaryType: 'monthly',
        baseSalary: 0,
        hireDate: '',
        locations: [],
        note: '',
        isActive: true,
    });
    const [staffUsers, setStaffUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'schedule'

    const [scheduleFilters, setScheduleFilters] = useState({
        locationId: '',
        employeeId: '',
    });
    const [schedulePagination, setSchedulePagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [schedules, setSchedules] = useState([]);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [loadingShifts, setLoadingShifts] = useState(false);
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [editingShift, setEditingShift] = useState(null);
    const [shiftForm, setShiftForm] = useState({
        name: '',
        startTime: '',
        endTime: '',
        checkInStartTime: '',
        checkInEndTime: '',
        note: '',
        isActive: true,
    });
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [scheduleForm, setScheduleForm] = useState({
        employeeId: '',
        locationId: '',
        date: '',
        shiftId: '',
        note: '',
        repeatWeekly: false,
        repeatDays: [], // Mảng các ngày được chọn: [1,2,3,4,5,6,0] (1=Thứ 2, 0=Chủ nhật)
        applyToOtherEmployees: false,
    });
    const [weekStart, setWeekStart] = useState(() => {
        const today = new Date();
        const day = today.getDay(); // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
        // Tính toán để lùi về Thứ 2 của tuần hiện tại
        if (day === 0) {
            // Nếu là Chủ nhật, lùi 6 ngày về Thứ 2
            today.setDate(today.getDate() - 6);
        } else if (day !== 1) {
            // Nếu không phải Thứ 2, lùi về Thứ 2 (lùi day-1 ngày)
            today.setDate(today.getDate() - (day - 1));
        }
        // Format date thành YYYY-MM-DD dùng local date components để tránh timezone issues
        const dateYear = today.getFullYear();
        const dateMonth = String(today.getMonth() + 1).padStart(2, '0');
        const dateDay = String(today.getDate()).padStart(2, '0');
        return `${dateYear}-${dateMonth}-${dateDay}`;
    });

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
            const res = await getUsers({ kind: 'staff', limit: 1000 });
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

    useEffect(() => {
        fetchLocations();
        fetchStaffUsers();
    }, []);

    const fetchSchedules = async () => {
        try {
            setLoadingSchedules(true);
            // Tự động set khoảng ngày theo tuần hiện tại
            const start = weekStart;
            // Parse weekStart từ string "YYYY-MM-DD" để tránh timezone issues
            const [year, month, day] = weekStart.split('-').map(Number);
            const endDate = new Date(year, month - 1, day);
            endDate.setDate(endDate.getDate() + 6);
            // Format date thành YYYY-MM-DD dùng local date components
            const endYear = endDate.getFullYear();
            const endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
            const endDay = String(endDate.getDate()).padStart(2, '0');
            const end = `${endYear}-${endMonth}-${endDay}`;

            // Tăng limit để fetch đủ schedules cho cả tuần (7 ngày * số nhân viên có thể có nhiều ca)
            const params = {
                page: 1,
                limit: 1000, // Tăng limit để fetch đủ schedules
                ...scheduleFilters,
                dateFrom: start,
                dateTo: end,
            };
            Object.keys(params).forEach((k) => {
                if (!params[k]) delete params[k];
            });
            const res = await getWorkSchedules(params);
            if (res.success) {
                setSchedules(res.data.schedules || []);
                setSchedulePagination(res.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
            toast.error(error.response?.data?.message || 'Không thể tải lịch làm việc');
        } finally {
            setLoadingSchedules(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page, pagination.limit, filters.status, filters.locationId]);

    const fetchShifts = async () => {
        try {
            setLoadingShifts(true);
            const res = await getShifts({ page: 1, limit: 1000, isActive: true });
            if (res.success) {
                setShifts(res.data.shifts || []);
            }
        } catch (error) {
            console.error('Error fetching shifts:', error);
            toast.error(error.response?.data?.message || 'Không thể tải danh sách ca làm việc');
        } finally {
            setLoadingShifts(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'schedule') {
            fetchSchedules();
            fetchShifts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, weekStart, schedulePagination.page, schedulePagination.limit, scheduleFilters.locationId, scheduleFilters.employeeId]);

    const openEditModal = (employee) => {
        setEditingEmployee(employee);
        setFormData({
            salaryType: employee.salaryType || 'monthly',
            baseSalary: employee.baseSalary ?? 0,
            hireDate: employee.hireDate ? employee.hireDate.slice(0, 10) : '',
            locations: (employee.locations || []).map((l) => l._id),
            note: employee.note || '',
            isActive: employee.isActive ?? true,
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingEmployee(null);
        setFormData({
            salaryType: 'monthly',
            baseSalary: 0,
            hireDate: '',
            locations: [],
            note: '',
            isActive: true,
        });
        setSelectedUserId('');
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                salaryType: formData.salaryType,
                baseSalary: Number(formData.baseSalary) || 0,
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
                    ...payload,
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

    const handleDelete = async (employee) => {
        if (!window.confirm(`Xóa hồ sơ nhân viên "${employee.user?.firstName || ''} ${employee.user?.lastName || ''}"?`)) {
            return;
        }
        try {
            const res = await deleteEmployee(employee._id);
            if (res.success) {
                toast.success('Xóa hồ sơ nhân viên thành công');
                fetchEmployees();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa hồ sơ nhân viên thất bại');
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

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > pagination.totalPages) return;
        setPagination((prev) => ({ ...prev, page: newPage }));
    };

    // Những tài khoản nhân viên chưa có hồ sơ Employee
    const availableStaffUsers = staffUsers.filter(
        (u) => !employees.some((emp) => emp.user && emp.user._id === u._id)
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

    const handleSchedulePageChange = (newPage) => {
        if (newPage < 1 || newPage > schedulePagination.totalPages) return;
        setSchedulePagination((prev) => ({ ...prev, page: newPage }));
    };

    const openShiftCreateModal = () => {
        setEditingShift(null);
        setShiftForm({
            name: '',
            startTime: '',
            endTime: '',
            checkInStartTime: '',
            checkInEndTime: '',
            note: '',
            isActive: true,
        });
        setShowShiftModal(true);
    };

    const openShiftEditModal = (shift) => {
        setEditingShift(shift);
        setShiftForm({
            name: shift.name || '',
            startTime: shift.startTime || '',
            endTime: shift.endTime || '',
            checkInStartTime: shift.checkInStartTime || '',
            checkInEndTime: shift.checkInEndTime || '',
            note: shift.note || '',
            isActive: shift.isActive ?? true,
        });
        setShowShiftModal(true);
    };

    const handleShiftSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!shiftForm.name || !shiftForm.startTime || !shiftForm.endTime || !shiftForm.checkInStartTime || !shiftForm.checkInEndTime) {
                toast.error('Vui lòng điền đầy đủ thông tin ca làm việc');
                return;
            }
            const payload = {
                name: shiftForm.name,
                startTime: shiftForm.startTime,
                endTime: shiftForm.endTime,
                checkInStartTime: shiftForm.checkInStartTime,
                checkInEndTime: shiftForm.checkInEndTime,
                note: shiftForm.note,
                isActive: shiftForm.isActive,
            };

            if (editingShift) {
                const res = await updateShift(editingShift._id, payload);
                if (res.success) {
                    toast.success('Cập nhật ca làm việc thành công');
                }
            } else {
                const res = await createShift(payload);
                if (res.success) {
                    toast.success('Tạo ca làm việc thành công');
                }
            }

            setShowShiftModal(false);
            setEditingShift(null);
            fetchShifts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lưu ca làm việc thất bại');
        }
    };

    const openScheduleCreateModal = (employeeId = '', date = '') => {
        setEditingSchedule(null);
        // Tự động lấy chi nhánh đầu tiên của employee nếu có
        let locationId = '';
        if (employeeId) {
            const employee = employees.find((e) => e._id === employeeId);
            if (employee && employee.locations && employee.locations.length > 0) {
                locationId = typeof employee.locations[0] === 'object' ? employee.locations[0]._id : employee.locations[0];
            }
        }
        setScheduleForm({
            employeeId,
            locationId,
            date,
            shiftId: '',
            note: '',
            repeatWeekly: false,
            repeatDays: [], // Mảng các ngày được chọn
            applyToOtherEmployees: false,
        });
        setShowScheduleModal(true);
    };

    const openScheduleEditModal = (schedule) => {
        setEditingSchedule(schedule);
        setScheduleForm({
            employeeId: schedule.employee?._id || '',
            locationId: schedule.location?._id || '',
            date: schedule.date ? (typeof schedule.date === 'string' ? schedule.date.slice(0, 10) : new Date(schedule.date).toISOString().slice(0, 10)) : '',
            shiftId: schedule.shift?._id || '',
            note: schedule.note || '',
            repeatWeekly: false,
            repeatDays: [],
            applyToOtherEmployees: false,
        });
        setShowScheduleModal(true);
    };

    const handleScheduleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!scheduleForm.employeeId || !scheduleForm.date || !scheduleForm.shiftId) {
                toast.error('Vui lòng chọn nhân viên, ngày làm việc và ca làm việc');
                return;
            }
            if (scheduleForm.repeatWeekly && (!scheduleForm.repeatDays || scheduleForm.repeatDays.length === 0)) {
                toast.error('Vui lòng chọn ít nhất một ngày để lặp lại');
                return;
            }
            // Tự động lấy chi nhánh từ employee nếu chưa có
            let locationId = scheduleForm.locationId;
            if (!locationId) {
                const employee = employees.find((e) => e._id === scheduleForm.employeeId);
                if (employee && employee.locations && employee.locations.length > 0) {
                    locationId = typeof employee.locations[0] === 'object'
                        ? employee.locations[0]._id
                        : employee.locations[0];
                } else {
                    toast.error('Nhân viên chưa được phân công chi nhánh làm việc');
                    return;
                }
            }
            const payload = {
                employeeId: scheduleForm.employeeId,
                locationId,
                date: scheduleForm.date,
                shiftId: scheduleForm.shiftId,
                note: scheduleForm.note,
                repeatWeekly: scheduleForm.repeatWeekly,
                repeatDays: scheduleForm.repeatDays || [],
                applyToOtherEmployees: scheduleForm.applyToOtherEmployees,
            };

            if (editingSchedule) {
                const res = await updateWorkSchedule(editingSchedule._id, payload);
                if (res.success) {
                    toast.success('Cập nhật lịch làm việc thành công');
                }
            } else {
                const res = await createWorkSchedule(payload);
                if (res.success) {
                    toast.success('Tạo lịch làm việc thành công');
                }
            }

            setShowScheduleModal(false);
            setEditingSchedule(null);
            // Fetch lại ngay lập tức để hiển thị ca vừa thêm
            await fetchSchedules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lưu lịch làm việc thất bại');
        }
    };

    const handleScheduleDelete = async (schedule) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa lịch làm việc này?')) return;
        try {
            const res = await deleteWorkSchedule(schedule._id);
            if (res.success) {
                toast.success('Xóa lịch làm việc thành công');
                fetchSchedules();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Xóa lịch làm việc thất bại');
        }
    };

    return (
        <div className="flex-1 px-6 py-8 bg-base-200 overflow-y-auto">
            <div className="space-y-4">
                <Header
                    roles={[]}
                    triggerRefresh={fetchEmployees}
                    title="Quản lý nhân viên"
                    subtitle="Quản lý hồ sơ nhân sự: chi nhánh, lương cơ bản, ngày vào làm, trạng thái"
                    showCreateButton={false}
                />

                {/* Tabs cho Quản lý nhân viên */}
                <div className="tabs tabs-lifted bg-base-100">
                    <button
                        type="button"
                        className={`tab tab-sm ${activeTab === 'profile' ? 'tab-active [--tab-border-color:var(--color-primary)]' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        Hồ sơ nhân viên
                    </button>
                    <button
                        type="button"
                        className={`tab tab-sm ${activeTab === 'schedule' ? 'tab-active [--tab-border-color:var(--color-primary)]' : ''}`}
                        onClick={() => setActiveTab('schedule')}
                    >
                        Lịch làm việc
                    </button>
                </div>

                {activeTab === 'profile' && (
                    <div className="space-y-4">
                        {/* Bộ lọc nhân viên + nút tạo hồ sơ */}
                        <div className="bg-base-100 rounded-lg shadow p-4 flex flex-wrap gap-4 items-end justify-between">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Trạng thái</span>
                                    </label>
                                    <select
                                        className="select select-sm w-40"
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
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold text-sm">Chi nhánh</span>
                                    </label>
                                    <select
                                        className="select select-sm w-64"
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
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm gap-2"
                                    onClick={openCreateModal}
                                >
                                    <Plus className="w-4 h-4" />
                                    Tạo nhân viên
                                </button>
                            </div>

                            {/* Bảng nhân viên */}
                            <div className="bg-base-100 rounded-lg shadow overflow-x-auto w-full">
                                {loading ? (
                                    <div className="p-6 text-center text-base-content/60">
                                        Đang tải danh sách nhân viên...
                                    </div>
                                ) : employees.length === 0 ? (
                                    <div className="p-6 text-center text-base-content/60">
                                        Chưa có hồ sơ nhân viên nào. Bạn cần tạo user nhân viên ở phần người dùng, sau đó gắn
                                        thêm hồ sơ nhân viên tại đây.
                                    </div>
                                ) : (
                                    <table className="table table-sm">
                                        <thead className="bg-blue-100">
                                            <tr>
                                                <th>Nhân viên</th>
                                                <th>Chi nhánh làm việc</th>
                                                <th>Kiểu lương</th>
                                                <th>Lương cơ bản</th>
                                                <th>Ngày vào làm</th>
                                                <th>Trạng thái</th>
                                                <th className="text-center">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {employees.map((emp) => (
                                                <tr key={emp._id}>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold">
                                                                {emp.user?.firstName} {emp.user?.lastName}
                                                            </span>
                                                            <span className="text-xs text-base-content/70">
                                                                {emp.user?.username}
                                                            </span>
                                                            <span className="text-xs text-base-content/70">
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
                                                    <td>
                                                        {emp.salaryType === 'monthly'
                                                            ? 'Lương tháng'
                                                            : emp.salaryType === 'shift'
                                                                ? 'Theo ca'
                                                                : emp.salaryType === 'hourly'
                                                                    ? 'Theo giờ'
                                                                    : emp.salaryType === 'commission'
                                                                        ? 'Hoa hồng'
                                                                        : '-'}
                                                    </td>
                                                    <td>
                                                        {emp.baseSalary
                                                            ? emp.baseSalary.toLocaleString('vi-VN')
                                                            : '-'}
                                                    </td>
                                                    <td>{formatDate(emp.hireDate)}</td>
                                                    <td>
                                                        <span
                                                            className={`badge badge-sm ${emp.isActive ? 'badge-success' : 'badge-neutral'}`}
                                                        >
                                                            {emp.isActive ? 'Đang làm' : 'Ngừng làm'}
                                                        </span>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() => openEditModal(emp)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm text-error"
                                                                onClick={() => handleDelete(emp)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* Phân trang đơn giản */}
                                {employees.length > 0 && (
                                    <div className="flex items-center justify-between px-4 py-2 border-t border-base-200 text-sm">
                                        <div>
                                            Trang {pagination.page} / {pagination.totalPages} ({pagination.total} nhân viên)
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page <= 1}
                                            >
                                                «
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs"
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page >= pagination.totalPages}
                                            >
                                                »
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'schedule' && (
                    <div>
                        <div className="space-y-4">
                            {/* Thanh điều hướng tuần + tìm kiếm */}
                            <div className="bg-base-100 rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => {
                                            // Parse weekStart từ string "YYYY-MM-DD" để tránh timezone issues
                                            const [year, month, day] = weekStart.split('-').map(Number);
                                            const d = new Date(year, month - 1, day);
                                            d.setDate(d.getDate() - 7);
                                            // Format date thành YYYY-MM-DD dùng local date components
                                            const dateYear = d.getFullYear();
                                            const dateMonth = String(d.getMonth() + 1).padStart(2, '0');
                                            const dateDay = String(d.getDate()).padStart(2, '0');
                                            setWeekStart(`${dateYear}-${dateMonth}-${dateDay}`);
                                            setSchedulePagination((prev) => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        « Tuần trước
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => {
                                            const today = new Date();
                                            const day = today.getDay(); // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
                                            // Tính toán để lùi về Thứ 2 của tuần hiện tại
                                            if (day === 0) {
                                                // Nếu là Chủ nhật, lùi 6 ngày về Thứ 2
                                                today.setDate(today.getDate() - 6);
                                            } else if (day !== 1) {
                                                // Nếu không phải Thứ 2, lùi về Thứ 2 (lùi day-1 ngày)
                                                today.setDate(today.getDate() - (day - 1));
                                            }
                                            // Format date thành YYYY-MM-DD dùng local date components
                                            const dateYear = today.getFullYear();
                                            const dateMonth = String(today.getMonth() + 1).padStart(2, '0');
                                            const dateDay = String(today.getDate()).padStart(2, '0');
                                            setWeekStart(`${dateYear}-${dateMonth}-${dateDay}`);
                                            setSchedulePagination((prev) => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        Tuần này
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs"
                                        onClick={() => {
                                            // Parse weekStart từ string "YYYY-MM-DD" để tránh timezone issues
                                            const [year, month, day] = weekStart.split('-').map(Number);
                                            const d = new Date(year, month - 1, day);
                                            d.setDate(d.getDate() + 7);
                                            // Format date thành YYYY-MM-DD dùng local date components
                                            const dateYear = d.getFullYear();
                                            const dateMonth = String(d.getMonth() + 1).padStart(2, '0');
                                            const dateDay = String(d.getDate()).padStart(2, '0');
                                            setWeekStart(`${dateYear}-${dateMonth}-${dateDay}`);
                                            setSchedulePagination((prev) => ({ ...prev, page: 1 }));
                                        }}
                                    >
                                        Tuần sau »
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm gap-2"
                                    onClick={openShiftCreateModal}
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm ca làm việc
                                </button>
                            </div>
                        </div>

                        <div className="bg-base-100 rounded-lg border border-base-200 overflow-x-auto w-full">
                            {loadingSchedules ? (
                                <div className="p-6 text-center text-base-content/60">
                                    Đang tải lịch làm việc...
                                </div>
                            ) : employees.length === 0 ? (
                                <div className="p-6 text-center text-base-content/60">
                                    Chưa có nhân viên để xếp lịch.
                                </div>
                            ) : (
                                <table className="table table-sm border border-base-300">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            <th className="w-64 border border-base-300">Nhân viên</th>
                                            {(() => {
                                                // Parse weekStart từ string "YYYY-MM-DD" để tránh timezone issues
                                                const [year, month, day] = weekStart.split('-').map(Number);
                                                const weekStartDate = new Date(year, month - 1, day);

                                                // Tạo mảng 7 ngày: Thứ 2 (idx=0) đến Chủ nhật (idx=6)
                                                // weekStart luôn là Thứ 2, nên ta tạo: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ nhật
                                                const days = [];
                                                for (let i = 0; i < 7; i++) {
                                                    const d = new Date(weekStartDate);
                                                    d.setDate(weekStartDate.getDate() + i);
                                                    days.push(d);
                                                }
                                                // Tên các ngày theo thứ tự hiển thị: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7, Chủ nhật
                                                // Dùng index thay vì getDay() để đảm bảo thứ tự hiển thị đúng
                                                const weekdayNames = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'];
                                                return days.map((d, idx) => {
                                                    // Dùng index để đảm bảo thứ tự: idx=0 là Thứ 2, idx=6 là Chủ nhật
                                                    const weekday = weekdayNames[idx];
                                                    return (
                                                        <th key={idx} className="text-center min-w-40 border border-base-300">
                                                            <div className="flex flex-col items-center text-xs">
                                                                <span>{weekday}</span>
                                                                <span className="font-semibold">
                                                                    {d.getDate()}/{d.getMonth() + 1}
                                                                </span>
                                                            </div>
                                                        </th>
                                                    );
                                                });
                                            })()}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <tr key={emp._id}>
                                                <td className="border border-base-300">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">
                                                            {emp.user?.firstName} {emp.user?.lastName}
                                                        </span>
                                                        <span className="text-xs text-base-content/70">
                                                            {emp.user?.username}
                                                        </span>
                                                    </div>
                                                </td>
                                                {Array.from({ length: 7 }).map((_, idx) => {
                                                    // Parse weekStart từ string "YYYY-MM-DD" để tránh timezone issues
                                                    const [year, month, day] = weekStart.split('-').map(Number);
                                                    const weekStartDate = new Date(year, month - 1, day);

                                                    // Tính toán date cho từng ngày trong tuần
                                                    const d = new Date(weekStartDate);
                                                    d.setDate(weekStartDate.getDate() + idx);

                                                    // Format date thành YYYY-MM-DD
                                                    const dateYear = d.getFullYear();
                                                    const dateMonth = String(d.getMonth() + 1).padStart(2, '0');
                                                    const dateDay = String(d.getDate()).padStart(2, '0');
                                                    const dateKey = `${dateYear}-${dateMonth}-${dateDay}`;
                                                    const cellSchedules = schedules.filter((sch) => {
                                                        // Xử lý cả Date object và string - đảm bảo format đúng
                                                        let schDate = '';
                                                        if (sch.date) {
                                                            if (typeof sch.date === 'string') {
                                                                // Nếu là string, lấy phần YYYY-MM-DD
                                                                schDate = sch.date.split('T')[0];
                                                            } else {
                                                                // Date object - format thành YYYY-MM-DD (dùng local time, không dùng UTC)
                                                                const d = new Date(sch.date);
                                                                // Dùng local time để tránh timezone issues
                                                                const year = d.getFullYear();
                                                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                                                const day = String(d.getDate()).padStart(2, '0');
                                                                schDate = `${year}-${month}-${day}`;
                                                            }
                                                        }
                                                        // So sánh employee ID - có thể là object (populated) hoặc string
                                                        const schEmployeeId = typeof sch.employee === 'object' && sch.employee !== null
                                                            ? sch.employee._id || sch.employee
                                                            : sch.employee;
                                                        const empId = String(emp._id);

                                                        // So sánh date và employee ID - đảm bảo format date giống nhau
                                                        const dateMatch = schDate === dateKey;
                                                        const employeeMatch = String(schEmployeeId) === empId;

                                                        // Debug log nếu cần
                                                        if (dateMatch && employeeMatch) {
                                                            console.log('Schedule match:', {
                                                                schDate,
                                                                dateKey,
                                                                shiftName: sch.shift?.name,
                                                                employeeName: emp.user?.firstName
                                                            });
                                                        }

                                                        return employeeMatch && dateMatch;
                                                    });
                                                    // Sort schedules theo startTime của shift
                                                    const sortedCellSchedules = [...cellSchedules].sort((a, b) => {
                                                        const timeA = a.shift?.startTime || '00:00';
                                                        const timeB = b.shift?.startTime || '00:00';
                                                        return timeA.localeCompare(timeB);
                                                    });

                                                    // Hàm tạo màu dựa trên shift ID để các ca khác nhau có màu khác nhau
                                                    const getShiftColor = (shiftId) => {
                                                        if (!shiftId) return 'bg-gray-100 text-gray-900';
                                                        // Tạo hash từ shift ID để có màu ổn định
                                                        const colors = [
                                                            'bg-blue-100 text-blue-900',
                                                            'bg-green-100 text-green-900',
                                                            'bg-yellow-100 text-yellow-900',
                                                            'bg-purple-100 text-purple-900',
                                                            'bg-pink-100 text-pink-900',
                                                            'bg-indigo-100 text-indigo-900',
                                                            'bg-orange-100 text-orange-900',
                                                            'bg-teal-100 text-teal-900',
                                                        ];
                                                        // Sử dụng shift ID để chọn màu
                                                        const hash = String(shiftId).split('').reduce((acc, char) => {
                                                            return acc + char.charCodeAt(0);
                                                        }, 0);
                                                        return colors[hash % colors.length];
                                                    };

                                                    return (
                                                        <td key={idx} className="align-top group/cell border border-base-300">
                                                            <div className="flex flex-col gap-1 min-h-[60px] relative">
                                                                {sortedCellSchedules.map((sch) => {
                                                                    const shiftName = sch.shift?.name || 'Chưa có ca';
                                                                    const shiftTime = sch.shift?.startTime && sch.shift?.endTime
                                                                        ? `${sch.shift.startTime} - ${sch.shift.endTime}`
                                                                        : '';
                                                                    const tooltipText = shiftTime ? `${shiftName} (${shiftTime})` : shiftName;
                                                                    const shiftId = sch.shift?._id || sch.shift;
                                                                    const colorClass = getShiftColor(shiftId);

                                                                    return (
                                                                        <div
                                                                            key={sch._id}
                                                                            className={`group/shift relative flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${colorClass} hover:opacity-80 transition-opacity`}
                                                                        >
                                                                            <button
                                                                                type="button"
                                                                                className="flex-1 text-left truncate"
                                                                                onClick={() => openScheduleEditModal(sch)}
                                                                            >
                                                                                {shiftName}
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                className="opacity-0 group-hover/shift:opacity-100 transition-opacity p-0.5 hover:bg-error/20 rounded shrink-0"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleScheduleDelete(sch);
                                                                                }}
                                                                                title="Xóa ca làm việc"
                                                                            >
                                                                                <X className="w-3 h-3 text-error" />
                                                                            </button>
                                                                            {/* Tooltip */}
                                                                            {shiftTime && (
                                                                                <div className="absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover/shift:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                                                                    {tooltipText}
                                                                                    <div className="absolute top-full left-2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                                <button
                                                                    type="button"
                                                                    className="cursor-pointer justify-start h-7 px-1 text-[11px] text-primary hover:bg-primary/10 opacity-0 group-hover/cell:opacity-100 transition-opacity"
                                                                    onClick={() => {
                                                                        // Dùng local date components để tránh timezone issues
                                                                        const year = d.getFullYear();
                                                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                                                        const day = String(d.getDate()).padStart(2, '0');
                                                                        const dateStr = `${year}-${month}-${day}`;
                                                                        openScheduleCreateModal(emp._id, dateStr);
                                                                    }}
                                                                >
                                                                    + Thêm lịch
                                                                </button>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

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
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                Chọn tài khoản nhân viên <span className="text-error">*</span>
                                            </span>
                                        </label>
                                        <select
                                            className="select select-sm w-full"
                                            value={selectedUserId}
                                            onChange={(e) => setSelectedUserId(e.target.value)}
                                        >
                                            <option value="">-- Chọn nhân viên --</option>
                                            {availableStaffUsers.map((u) => (
                                                <option key={u._id} value={u._id}>
                                                    {u.firstName} {u.lastName} ({u.username}) - {u.email}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Kiểu lương</span>
                                        </label>
                                        <select
                                            className="select select-sm w-full"
                                            value={formData.salaryType}
                                            onChange={(e) =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    salaryType: e.target.value,
                                                }))
                                            }
                                        >
                                            <option value="monthly">Lương cố định</option>
                                            <option value="shift">Theo ca</option>
                                            <option value="hourly">Theo giờ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">Lương cơ bản</span>
                                        </label>
                                        <input
                                            type="text"
                                            className="input input-bordered input-sm w-full"
                                            value={formData.baseSalary}
                                            onChange={(e) =>
                                                setFormData((prev) => {
                                                    const onlyDigits = e.target.value.replace(/\D/g, '');
                                                    return {
                                                        ...prev,
                                                        baseSalary: onlyDigits,
                                                    };
                                                })
                                            }
                                            min={0}
                                        />
                                    </div>
                                </div>
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
                                        <label className="label cursor-pointer">
                                            <span className="label-text font-semibold">Đang làm việc</span>
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs checkbox-primary ml-2"
                                                checked={formData.isActive}
                                                onChange={(e) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        isActive: e.target.checked,
                                                    }))
                                                }
                                            />
                                        </label>
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

                {/* Modal 1: Tạo / chỉnh sửa ca làm việc (Shift Template) */}
                {showShiftModal && (
                    <dialog className="modal modal-open">
                        <div className="modal-box max-w-3xl">
                            <h3 className="font-bold text-lg mb-4">
                                {editingShift ? 'Chỉnh sửa ca làm việc' : 'Thêm ca làm việc'}
                            </h3>
                            <form onSubmit={handleShiftSubmit} className="space-y-4">
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            Tên ca làm việc <span className="text-error">*</span>
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full"
                                        value={shiftForm.name}
                                        onChange={(e) =>
                                            setShiftForm((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                        placeholder="Ví dụ: Ca sáng, Ca chiều..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                Giờ làm việc <span className="text-error">*</span>
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const startTime = parseTime(shiftForm.startTime);
                                                return (
                                                    <>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={startTime.hour}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(e.target.value, startTime.minute);
                                                                setShiftForm((prev) => ({ ...prev, startTime: newTime }));
                                                            }}
                                                        >
                                                            {hourOptions.map((h) => (
                                                                <option key={h} value={h}>
                                                                    {h}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs">:</span>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={startTime.minute}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(startTime.hour, e.target.value);
                                                                setShiftForm((prev) => ({ ...prev, startTime: newTime }));
                                                            }}
                                                        >
                                                            {minuteOptions.map((m) => (
                                                                <option key={m} value={m}>
                                                                    {m}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                );
                                            })()}
                                            <span className="text-xs">Đến</span>
                                            {(() => {
                                                const endTime = parseTime(shiftForm.endTime);
                                                return (
                                                    <>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={endTime.hour}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(e.target.value, endTime.minute);
                                                                setShiftForm((prev) => ({ ...prev, endTime: newTime }));
                                                            }}
                                                        >
                                                            {hourOptions.map((h) => (
                                                                <option key={h} value={h}>
                                                                    {h}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs">:</span>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={endTime.minute}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(endTime.hour, e.target.value);
                                                                setShiftForm((prev) => ({ ...prev, endTime: newTime }));
                                                            }}
                                                        >
                                                            {minuteOptions.map((m) => (
                                                                <option key={m} value={m}>
                                                                    {m}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">
                                            <span className="label-text font-semibold">
                                                Giờ cho phép chấm công <span className="text-error">*</span>
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            {(() => {
                                                const checkInStartTime = parseTime(shiftForm.checkInStartTime);
                                                return (
                                                    <>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={checkInStartTime.hour}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(e.target.value, checkInStartTime.minute);
                                                                setShiftForm((prev) => ({ ...prev, checkInStartTime: newTime }));
                                                            }}
                                                        >
                                                            {hourOptions.map((h) => (
                                                                <option key={h} value={h}>
                                                                    {h}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs">:</span>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={checkInStartTime.minute}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(checkInStartTime.hour, e.target.value);
                                                                setShiftForm((prev) => ({ ...prev, checkInStartTime: newTime }));
                                                            }}
                                                        >
                                                            {minuteOptions.map((m) => (
                                                                <option key={m} value={m}>
                                                                    {m}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                );
                                            })()}
                                            <span className="text-xs">Đến</span>
                                            {(() => {
                                                const checkInEndTime = parseTime(shiftForm.checkInEndTime);
                                                return (
                                                    <>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={checkInEndTime.hour}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(e.target.value, checkInEndTime.minute);
                                                                setShiftForm((prev) => ({ ...prev, checkInEndTime: newTime }));
                                                            }}
                                                        >
                                                            {hourOptions.map((h) => (
                                                                <option key={h} value={h}>
                                                                    {h}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <span className="text-xs">:</span>
                                                        <select
                                                            className="select select-bordered select-sm w-20"
                                                            value={checkInEndTime.minute}
                                                            onChange={(e) => {
                                                                const newTime = formatTime(checkInEndTime.hour, e.target.value);
                                                                setShiftForm((prev) => ({ ...prev, checkInEndTime: newTime }));
                                                            }}
                                                        >
                                                            {minuteOptions.map((m) => (
                                                                <option key={m} value={m}>
                                                                    {m}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                );
                                            })()}
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
                                        value={shiftForm.note}
                                        onChange={(e) =>
                                            setShiftForm((prev) => ({ ...prev, note: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="label cursor-pointer">
                                        <span className="label-text font-semibold">Đang hoạt động</span>
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs checkbox-primary ml-2"
                                            checked={shiftForm.isActive}
                                            onChange={(e) =>
                                                setShiftForm((prev) => ({
                                                    ...prev,
                                                    isActive: e.target.checked,
                                                }))
                                            }
                                        />
                                    </label>
                                </div>
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setShowShiftModal(false);
                                            setEditingShift(null);
                                        }}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm">
                                        {editingShift ? 'Lưu' : 'Tạo ca làm việc'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <form method="dialog" className="modal-backdrop">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowShiftModal(false);
                                    setEditingShift(null);
                                }}
                            >
                                Đóng
                            </button>
                        </form>
                    </dialog>
                )}

                {/* Modal 2: Thêm lịch làm việc (Assign Schedule) */}
                {showScheduleModal && (
                    <dialog className="modal modal-open">
                        <div className="modal-box max-w-3xl">
                            <h3 className="font-bold text-lg mb-4">
                                {editingSchedule ? 'Chỉnh sửa lịch làm việc' : 'Thêm lịch làm việc'}
                            </h3>
                            <form onSubmit={handleScheduleSubmit} className="space-y-4">
                                {scheduleForm.employeeId && scheduleForm.date && (() => {
                                    const employee = employees.find((e) => e._id === scheduleForm.employeeId);
                                    const locationId = scheduleForm.locationId || (employee?.locations?.[0] ? (typeof employee.locations[0] === 'object' ? employee.locations[0]._id : employee.locations[0]) : '');
                                    const location = locations.find((loc) => loc._id === locationId);
                                    return (
                                        <div className="p-3 rounded bg-base-200 text-sm">
                                            <div className="font-semibold">
                                                {employee?.user?.firstName || ''} {employee?.user?.lastName || ''}
                                            </div>
                                            <div className="text-xs text-base-content/70">
                                                {new Date(scheduleForm.date).toLocaleDateString('vi-VN')}
                                                {location && ` • ${location.code} - ${location.name}`}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div className="grid grid-cols-2 gap-4">
                                    {!scheduleForm.employeeId && (
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    Nhân viên <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <select
                                                className="select select-sm w-full"
                                                value={scheduleForm.employeeId}
                                                onChange={(e) => {
                                                    const selectedEmployeeId = e.target.value;
                                                    const selectedEmployee = employees.find((emp) => emp._id === selectedEmployeeId);
                                                    // Tự động lấy chi nhánh đầu tiên của employee
                                                    let locationId = '';
                                                    if (selectedEmployee && selectedEmployee.locations && selectedEmployee.locations.length > 0) {
                                                        locationId = typeof selectedEmployee.locations[0] === 'object'
                                                            ? selectedEmployee.locations[0]._id
                                                            : selectedEmployee.locations[0];
                                                    }
                                                    setScheduleForm((prev) => ({
                                                        ...prev,
                                                        employeeId: selectedEmployeeId,
                                                        locationId,
                                                    }));
                                                }}
                                            >
                                                <option value="">-- Chọn nhân viên --</option>
                                                {employees.map((emp) => (
                                                    <option key={emp._id} value={emp._id}>
                                                        {emp.user?.firstName} {emp.user?.lastName} ({emp.user?.username})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {!scheduleForm.date && (
                                        <div>
                                            <label className="label">
                                                <span className="label-text font-semibold">
                                                    Ngày làm việc <span className="text-error">*</span>
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered input-sm w-full"
                                                value={scheduleForm.date}
                                                onChange={(e) =>
                                                    setScheduleForm((prev) => ({
                                                        ...prev,
                                                        date: e.target.value,
                                                    }))
                                                }
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">
                                            Chọn ca làm việc <span className="text-error">*</span>
                                        </span>
                                    </label>
                                    <select
                                        className="select select-sm w-full"
                                        value={scheduleForm.shiftId}
                                        onChange={(e) =>
                                            setScheduleForm((prev) => ({
                                                ...prev,
                                                shiftId: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">-- Chọn ca làm việc --</option>
                                        {(() => {
                                            // Lấy các ca đã được chọn cho nhân viên trong ngày này
                                            const selectedShiftIds = new Set();
                                            if (scheduleForm.employeeId && scheduleForm.date) {
                                                schedules.forEach((sch) => {
                                                    const schEmployeeId = typeof sch.employee === 'object' && sch.employee !== null
                                                        ? sch.employee._id || sch.employee
                                                        : sch.employee;
                                                    let schDate = '';
                                                    if (sch.date) {
                                                        if (typeof sch.date === 'string') {
                                                            schDate = sch.date.slice(0, 10);
                                                        } else {
                                                            schDate = new Date(sch.date).toISOString().slice(0, 10);
                                                        }
                                                    }
                                                    if (String(schEmployeeId) === String(scheduleForm.employeeId) &&
                                                        schDate === scheduleForm.date &&
                                                        sch.shift?._id) {
                                                        selectedShiftIds.add(String(sch.shift._id));
                                                    }
                                                });
                                            }
                                            // Filter và sort shifts
                                            return shifts
                                                .filter((shift) => {
                                                    // Nếu đang edit, cho phép chọn ca hiện tại
                                                    if (editingSchedule && String(shift._id) === String(scheduleForm.shiftId)) {
                                                        return true;
                                                    }
                                                    // Không cho chọn ca đã được chọn
                                                    return !selectedShiftIds.has(String(shift._id));
                                                })
                                                .sort((a, b) => {
                                                    // Sort theo startTime
                                                    const timeA = a.startTime || '00:00';
                                                    const timeB = b.startTime || '00:00';
                                                    return timeA.localeCompare(timeB);
                                                })
                                                .map((shift) => (
                                                    <option key={shift._id} value={shift._id}>
                                                        {shift.name} ({shift.startTime} - {shift.endTime})
                                                    </option>
                                                ));
                                        })()}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">
                                        <span className="label-text font-semibold">Ghi chú</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        rows={3}
                                        value={scheduleForm.note}
                                        onChange={(e) =>
                                            setScheduleForm((prev) => ({ ...prev, note: e.target.value }))
                                        }
                                    />
                                </div>
                                {!editingSchedule && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="label cursor-pointer">
                                                <span className="label-text font-semibold">Lặp lại hàng tuần</span>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs checkbox-primary ml-2"
                                                    checked={scheduleForm.repeatWeekly}
                                                    onChange={(e) =>
                                                        setScheduleForm((prev) => ({
                                                            ...prev,
                                                            repeatWeekly: e.target.checked,
                                                            // Nếu bật lặp lại, tự động chọn ngày hiện tại
                                                            repeatDays: e.target.checked && prev.repeatDays.length === 0
                                                                ? (() => {
                                                                    if (prev.date) {
                                                                        const d = new Date(prev.date);
                                                                        const dayOfWeek = d.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ...
                                                                        return [dayOfWeek === 0 ? 0 : dayOfWeek];
                                                                    }
                                                                    return [];
                                                                })()
                                                                : e.target.checked ? prev.repeatDays : [],
                                                        }))
                                                    }
                                                />
                                            </label>
                                        </div>
                                        {scheduleForm.repeatWeekly && (
                                            <div className="space-y-2">
                                                <p className="text-xs text-base-content/70">
                                                    Lịch làm việc sẽ được tự động lặp lại vào các ngày trong tuần
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {[
                                                        { value: 1, label: 'Thứ 2' },
                                                        { value: 2, label: 'Thứ 3' },
                                                        { value: 3, label: 'Thứ 4' },
                                                        { value: 4, label: 'Thứ 5' },
                                                        { value: 5, label: 'Thứ 6' },
                                                        { value: 6, label: 'Thứ 7' },
                                                        { value: 0, label: 'Chủ nhật' },
                                                    ].map((day) => (
                                                        <button
                                                            key={day.value}
                                                            type="button"
                                                            className={`btn btn-sm ${scheduleForm.repeatDays.includes(day.value)
                                                                ? 'btn-primary'
                                                                : 'btn-outline'
                                                                }`}
                                                            onClick={() => {
                                                                setScheduleForm((prev) => {
                                                                    const newDays = prev.repeatDays.includes(day.value)
                                                                        ? prev.repeatDays.filter((d) => d !== day.value)
                                                                        : [...prev.repeatDays, day.value].sort((a, b) => {
                                                                            // Sort: 1,2,3,4,5,6,0 (Chủ nhật cuối)
                                                                            if (a === 0) return 1;
                                                                            if (b === 0) return -1;
                                                                            return a - b;
                                                                        });
                                                                    return {
                                                                        ...prev,
                                                                        repeatDays: newDays,
                                                                    };
                                                                });
                                                            }}
                                                        >
                                                            {day.label}
                                                        </button>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-ghost text-primary text-xs"
                                                        onClick={() => {
                                                            const allDays = [1, 2, 3, 4, 5, 6, 0];
                                                            setScheduleForm((prev) => ({
                                                                ...prev,
                                                                repeatDays: prev.repeatDays.length === allDays.length ? [] : allDays,
                                                            }));
                                                        }}
                                                    >
                                                        {scheduleForm.repeatDays.length === 7 ? 'Xóa chọn tất cả' : 'Chọn tất cả'}
                                                    </button>
                                                </div>
                                                {scheduleForm.repeatDays.length > 0 && (
                                                    <p className="text-xs text-base-content/70">
                                                        Lặp lại{' '}
                                                        {scheduleForm.repeatDays
                                                            .map((d) => {
                                                                const dayNames = {
                                                                    1: 'Thứ 2',
                                                                    2: 'Thứ 3',
                                                                    3: 'Thứ 4',
                                                                    4: 'Thứ 5',
                                                                    5: 'Thứ 6',
                                                                    6: 'Thứ 7',
                                                                    0: 'Chủ nhật',
                                                                };
                                                                return dayNames[d];
                                                            })
                                                            .join(', ')}{' '}
                                                        hàng tuần
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <label className="label cursor-pointer">
                                            <span className="label-text font-semibold">
                                                Áp dụng cho nhân viên khác
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="checkbox checkbox-xs checkbox-primary ml-2"
                                                checked={scheduleForm.applyToOtherEmployees}
                                                onChange={(e) =>
                                                    setScheduleForm((prev) => ({
                                                        ...prev,
                                                        applyToOtherEmployees: e.target.checked,
                                                    }))
                                                }
                                            />
                                        </label>
                                    </div>
                                )}
                                <div className="modal-action">
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            setShowScheduleModal(false);
                                            setEditingSchedule(null);
                                        }}
                                    >
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm">
                                        {editingSchedule ? 'Lưu' : 'Thêm lịch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        <form method="dialog" className="modal-backdrop">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowScheduleModal(false);
                                    setEditingSchedule(null);
                                }}
                            >
                                Đóng
                            </button>
                        </form>
                    </dialog>
                )}
            </div>
        </div >
    );
};

export default StaffManagementPage;

