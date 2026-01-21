import { formatDateTime } from '@/lib/utils';
import { useLogStore } from '@/stores/useLogStore';
import { Activity, Clock, History, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';

const ActivityHistoryCard = () => {
    const { activityLogs, loadingLogs, logPagination, fetchActivityLogs } = useLogStore();

    return (
        <div className="bg-base-100 rounded-lg shadow-lg p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2 text-primary">
                    <History className="w-6 h-6" />
                    Lịch sử hoạt động
                </h2>
            </div>

            {loadingLogs ? (
                <div className="flex items-center justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : activityLogs.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có hoạt động nào</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th className="w-[180px]">Thời gian</th>
                                    <th className="w-[120px]">Hành động</th>
                                    <th>Mô tả</th>
                                    <th className="w-[100px]">Resource</th>
                                    <th className="w-[140px]">IP Address</th>
                                    <th className="w-[100px]">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activityLogs.map((log) => {
                                    const getStatusColor = (status) => {
                                        switch (status) {
                                            case 'success':
                                                return 'badge-success';
                                            case 'failed':
                                                return 'badge-error';
                                            case 'error':
                                                return 'badge-warning';
                                            default:
                                                return 'badge-ghost';
                                        }
                                    };



                                    return (
                                        <tr key={log._id} className="hover">
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-base-content/60" />
                                                    <span className="text-sm whitespace-nowrap">
                                                        {formatDateTime(log.createdAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge badge-info badge-sm">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="max-w-md">
                                                    <p className="text-sm font-medium line-clamp-2">
                                                        {log.description || `${log.action} ${log.resource}`}
                                                    </p>
                                                </div>
                                            </td>
                                            <td>
                                                {log.resource ? (
                                                    <span className="badge badge-primary badge-sm">
                                                        {log.resource}
                                                    </span>
                                                ) : (
                                                    <span className="text-base-content/40 text-sm">-</span>
                                                )}
                                            </td>
                                            <td>
                                                {log.ipAddress ? (
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3 text-base-content/60" />
                                                        <span className="text-xs font-mono">
                                                            {log.ipAddress}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-base-content/40 text-sm">-</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`badge badge-sm ${getStatusColor(log.status)}`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-base-300">
                            <div className="text-sm text-base-content/60">
                                Hiển thị {((logPagination.page - 1) * logPagination.limit) + 1} -{' '}
                                {Math.min(logPagination.page * logPagination.limit, logPagination.total)} trong tổng số{' '}
                                {logPagination.total} hoạt động
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => fetchActivityLogs(logPagination.page - 1)}
                                    disabled={logPagination.page === 1}
                                    className="btn btn-sm btn-ghost"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Trước
                                </button>
                                <span className="flex items-center px-4 text-sm">
                                    Trang {logPagination.page} / {logPagination.totalPages}
                                </span>
                                <button
                                    onClick={() => fetchActivityLogs(logPagination.page + 1)}
                                    disabled={logPagination.page >= logPagination.totalPages}
                                    className="btn btn-sm btn-ghost"
                                >
                                    Sau
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ActivityHistoryCard;

