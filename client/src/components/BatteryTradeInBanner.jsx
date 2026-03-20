import { useNavigate } from 'react-router';
import { RotateCw } from 'lucide-react';

export function BatteryTradeInBanner() {
  const navigate = useNavigate();

  return (
    <div className="py-10 bg-white border-y border-gray-200">
      <div className="container mx-auto px-4">
        <div
          onClick={() => navigate('/battery-trade-in')}
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl text-white cursor-pointer hover:opacity-95 transition"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <RotateCw className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Thu cũ đổi mới ắc quy</h3>
              <p className="text-blue-100 text-sm mt-1">
                Mang ắc quy cũ đến cửa hàng, nhận giá tốt khi mua ắc quy mới
              </p>
            </div>
          </div>
          <button className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium whitespace-nowrap">
            Đăng ký thu cũ →
          </button>
        </div>
      </div>
    </div>
  );
}
