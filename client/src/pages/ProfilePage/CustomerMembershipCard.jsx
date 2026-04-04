import { Award, RefreshCw } from 'lucide-react';

/**
 * Hiển thị hạng thành viên, % ưu đãi và tổng chi tiêu tích lũy (dữ liệu từ checkout-preview).
 */
const CustomerMembershipCard = ({ loading, error, data, onRetry }) => {
    const tierName = data?.tierName;
    const discountPercent = Number(data?.discountPercent) || 0;
    const accumulatedAmount = Number(data?.accumulatedAmount) || 0;
    const showLoading = loading || (!error && data == null);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <Award className="w-6 h-6 text-amber-600" />
                Hạng thành viên
            </h2>

            {showLoading && (
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                    <span className="loading loading-spinner loading-sm text-amber-600" />
                    Đang tải thông tin hạng...
                </div>
            )}

            {!showLoading && error && (
                <div className="rounded-xl border border-red-100 bg-red-50/80 p-4 text-sm text-red-800">
                    <p>Không thể tải thông tin hạng thành viên.</p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="btn btn-sm btn-outline btn-error mt-3 gap-1"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Thử lại
                    </button>
                </div>
            )}

            {!showLoading && !error && (
                <div className="space-y-4">
                    {tierName ? (
                        <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-xs text-amber-700 font-medium">Hạng hiện tại</p>
                            <p className="text-lg font-semibold text-amber-900 mt-0.5">{tierName}</p>
                            {discountPercent > 0 && (
                                <p className="text-xs text-amber-700 mt-2">
                                    Ưu đãi khi mua hàng: giảm <strong>{discountPercent}%</strong> trên giá trị đơn (theo chính sách cửa hàng).
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                            <p className="text-sm font-medium text-gray-800">Chưa đạt hạng thành viên</p>
                            <p className="text-xs text-gray-600 mt-1">
                                Tích lũy thêm chi tiêu để được nâng hạng và nhận ưu đãi.
                            </p>
                        </div>
                    )}

                    <div className={`flex items-start gap-3 p-4 rounded-xl ${tierName ? 'bg-gray-50' : 'bg-gray-50/80'}`}>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 font-medium">Tổng chi tiêu tích lũy</p>
                            <p className="text-base font-semibold text-gray-900 mt-0.5 tabular-nums">
                                {accumulatedAmount.toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Số tiền được cộng dồn từ các đơn đã thanh toán thành công, dùng để xác định hạng của bạn.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerMembershipCard;
