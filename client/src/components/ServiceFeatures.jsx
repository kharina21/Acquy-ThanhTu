import { Truck, CreditCard, RotateCw, Headphones, Clock } from 'lucide-react';

export function ServiceFeatures() {
  const features = [
    {
      icon: Truck,
      title: 'GIAO HÀNG',
      subtitle: 'Miễn phí',
    },
    {
      icon: CreditCard,
      title: 'THANH TOÁN',
      subtitle: 'Dễ Nhận Hàng',
    },
    {
      icon: RotateCw,
      title: 'HOÀN TRẢ TIỀN',
      subtitle: 'Trong 3 ngày',
    },
    {
      icon: Headphones,
      title: 'TƯ VẤN',
      subtitle: 'Miễn Phí',
    },
    {
      icon: Clock,
      title: 'HỖ TRỢ',
      subtitle: '24/7',
    },
  ];

  return (
    <div className="bg-gray-50 py-10">
      <div className="container mx-auto px-4">
        {/* Chỉnh sửa grid-cols-5 để 5 item dàn hàng ngang đẹp nhất */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative flex flex-col items-center text-center p-6 
                           bg-white border-2 border-gray-200 rounded-xl 
                           shadow-[0_4px_0_0_rgba(0,0,0,0.05)] 
                           hover:border-blue-500 hover:shadow-xl 
                           transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Vòng tròn Icon đậm đà */}
                <div className="bg-blue-600 p-3 rounded-lg mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-200">
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>

                {/* Nội dung chữ */}
                <h3 className="font-bold text-[14px] text-blue-900 mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs font-medium text-gray-500 italic">
                  {feature.subtitle}
                </p>
                
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}