export function ProductSection() {
  const tabs = [
    'Tất cả',
    'Ắc Quy GS',
    'Ắc Quy Đồng Nai',
    'AcQuy Rocket',
    'Acquy Atlas',
    'Acquy Varta',
  ];

  const products = [
    { id: 1, name: 'GS Battery', image: 'https://images.unsplash.com/photo-1673337188103-c196140adebd?w=300' },
    { id: 2, name: 'Đồng Nai Battery', image: 'https://images.unsplash.com/photo-1673337188103-c196140adebd?w=300' },
    { id: 3, name: 'Rocket Battery', image: 'https://images.unsplash.com/photo-1673337188103-c196140adebd?w=300' },
    { id: 4, name: 'Atlas Battery', image: 'https://images.unsplash.com/photo-1673337188103-c196140adebd?w=300' },
    { id: 5, name: 'Varta Battery', image: 'https://images.unsplash.com/photo-1673337188103-c196140adebd?w=300' },
  ];

  return (
    <div className="py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <div className="bg-blue-600 text-white px-4 py-3 mb-6">
          <h2 className="font-bold text-lg">ẮC QUY Ô TÔ</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab, index) => (
            <button
              key={index}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                index === 0
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Brands */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-blue-100 rounded flex items-center justify-center">
              <span className="text-blue-600 font-bold">GS</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">GS BATTERY</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-red-100 rounded flex items-center justify-center">
              <span className="text-red-600 font-bold">ĐN</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">ĐỒNG NAI BATTERY</h3>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="aspect-square bg-gray-100 rounded mb-3 flex items-center justify-center overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-center text-sm font-medium">{product.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
