import { Truck, CreditCard, RotateCw, Gift, Headphones, HeadphonesIcon } from 'lucide-react';

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
      subtitle: 'Dễ Nhẹn Hàng',
    },
    {
      icon: RotateCw,
      title: 'HOÀN TRẢ TIỀN',
      subtitle: 'Trong 3 ngày',
    },
    {
      icon: Gift,
      title: 'QUÀ TẶNG',
      subtitle: 'Miễn phí',
    },
    {
      icon: Headphones,
      title: 'TƯ VẤN',
      subtitle: 'Miễn Phí',
    },
    {
      icon: HeadphonesIcon,
      title: 'HỖ TRỢ',
      subtitle: '24/7',
    },
  ];

  return (
    <div className="bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="bg-blue-100 p-3 rounded-full mb-2">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-600">{feature.subtitle}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
