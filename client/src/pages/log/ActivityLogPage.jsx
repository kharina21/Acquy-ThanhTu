import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserRole } from '@/hooks/useUserRole';
import api from '@/lib/axios';

// Format date helper
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const ActivityLogPage = () => {
    const { user } = useAuthStore();
    const { isAdmin } = useUserRole();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });
    const [filters, setFilters] = useState({
        action: '',
        resource: '',
        status: '',
        startDate: '',
        endDate: '',
        search: '',
    });

    // Fetch logs
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                ...filters,
            };

            // Remove empty filters
            Object.keys(params).forEach((key) => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const endpoint = isAdmin ? '/activity-logs' : '/activity-logs/me';
            const res = await api.get(endpoint, { params });

            if (res.data.success) {
                setLogs(res.data.data.logs);
                setPagination(res.data.data.pagination);
            }
        } catch (error) {
            console.error('Error fetching activity logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, filters]);

    // Format action badge color
    const getActionBadgeColor = (action) => {
        const colors = {
            create: 'badge-success',
            read: 'badge-info',
            update: 'badge-warning',
            delete: 'badge-error',
            login: 'badge-success',
            logout: 'badge-neutral',
            assign_role: 'badge-primary',
            revoke_role: 'badge-error',
            update_permission: 'badge-warning',
        };
        return colors[action] || 'badge-neutral';
    };

    // Format status badge color
    const getStatusBadgeColor = (status) => {
        const colors = {
            success: 'badge-success',
            failed: 'badge-error',
            error: 'badge-error',
        };
        return colors[status] || 'badge-neutral';
    };

    return (
        <div className='container mx-auto px-4 py-8'>
            <div className='max-w-7xl mx-auto'>
                <h1 className='text-3xl font-bold mb-6'>Activity Log</h1>

                {/* Filters */}
                <div className='bg-base-100 rounded-lg shadow-lg p-6 mb-6'>
                    <h2 className='text-xl font-semibold mb-4'>Bộ lọc</h2>
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        <div>
                            <label className='label'>
                                <span className='label-text'>Hành động</span>
                            </label>
                            <select
                                className='select select-bordered w-full'
                                value={filters.action}
                                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            >
                                <option value=''>Tất cả</option>
                                <option value='create'>Create</option>
                                <option value='update'>Update</option>
                                <option value='delete'>Delete</option>
                                <option value='login'>Login</option>
                                <option value='logout'>Logout</option>
                                <option value='assign_role'>Assign Role</option>
                                <option value='revoke_role'>Revoke Role</option>
                            </select>
                        </div>

                        <div>
                            <label className='label'>
                                <span className='label-text'>Tài nguyên</span>
                            </label>
                            <input
                                type='text'
                                className='input input-bordered w-full'
                                placeholder='user, role, permission...'
                                value={filters.resource}
                                onChange={(e) =>
                                    setFilters({ ...filters, resource: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className='label'>
                                <span className='label-text'>Trạng thái</span>
                            </label>
                            <select
                                className='select select-bordered w-full'
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value=''>Tất cả</option>
                                <option value='success'>Success</option>
                                <option value='failed'>Failed</option>
                                <option value='error'>Error</option>
                            </select>
                        </div>

                        <div>
                            <label className='label'>
                                <span className='label-text'>Từ ngày</span>
                            </label>
                            <input
                                type='date'
                                className='input input-bordered w-full'
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className='label'>
                                <span className='label-text'>Đến ngày</span>
                            </label>
                            <input
                                type='date'
                                className='input input-bordered w-full'
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                            />
                        </div>

                        <div>
                            <label className='label'>
                                <span className='label-text'>Tìm kiếm</span>
                            </label>
                            <input
                                type='text'
                                className='input input-bordered w-full'
                                placeholder='Tìm kiếm...'
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className='mt-4'>
                        <button
                            className='btn btn-primary'
                            onClick={() => {
                                setFilters({
                                    action: '',
                                    resource: '',
                                    status: '',
                                    startDate: '',
                                    endDate: '',
                                    search: '',
                                });
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>

                {/* Logs Table */}
                <div className='bg-base-100 rounded-lg shadow-lg overflow-hidden'>
                    {loading ? (
                        <div className='flex justify-center items-center p-8'>
                            <span className='loading loading-spinner loading-lg'></span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className='p-8 text-center'>
                            <p>Không có activity log nào</p>
                        </div>
                    ) : (
                        <>
                            <div className='overflow-x-auto'>
                                <table className='table table-zebra w-full'>
                                    <thead>
                                        <tr>
                                            <th>Thời gian</th>
                                            <th>User</th>
                                            <th>Hành động</th>
                                            <th>Tài nguyên</th>
                                            <th>Mô tả</th>
                                            <th>Trạng thái</th>
                                            <th>IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log._id}>
                                                <td>{formatDate(log.createdAt)}</td>
                                                <td>{log.userId?.username || 'Unknown'}</td>
                                                <td>
                                                    <span
                                                        className={`badge ${getActionBadgeColor(
                                                            log.action
                                                        )}`}
                                                    >
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td>{log.resource}</td>
                                                <td className='max-w-xs truncate'>
                                                    {log.description || '-'}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`badge ${getStatusBadgeColor(
                                                            log.status
                                                        )}`}
                                                    >
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td>{log.ipAddress || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className='flex justify-between items-center p-4 border-t'>
                                <div>
                                    <p className='text-sm'>
                                        Hiển thị {logs.length} / {pagination.total} logs
                                    </p>
                                </div>
                                <div className='join'>
                                    <button
                                        className='join-item btn btn-sm'
                                        disabled={pagination.page === 1}
                                        onClick={() =>
                                            setPagination({
                                                ...pagination,
                                                page: pagination.page - 1,
                                            })
                                        }
                                    >
                                        «
                                    </button>
                                    <button className='join-item btn btn-sm'>
                                        Trang {pagination.page} / {pagination.totalPages}
                                    </button>
                                    <button
                                        className='join-item btn btn-sm'
                                        disabled={pagination.page === pagination.totalPages}
                                        onClick={() =>
                                            setPagination({
                                                ...pagination,
                                                page: pagination.page + 1,
                                            })
                                        }
                                    >
                                        »
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogPage;
