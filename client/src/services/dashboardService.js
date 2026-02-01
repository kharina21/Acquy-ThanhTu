// import api from '@/lib/axios';

/**
 * Lấy thống kê tổng quan dashboard (doanh thu, top khách hàng, top sản phẩm)
 * Hiện dùng dữ liệu mẫu; khi có API backend chỉ cần gọi API thật và trả về cùng cấu trúc.
 */
export const getDashboardStats = async () => {
    try {
        // TODO: Khi backend có API, thay bằng:
        // const res = await api.get('/dashboard/stats');
        // return res.data;
        await new Promise((r) => setTimeout(r, 400));
        return {
            revenue: {
                total: 125000000,
                period: 'tháng này',
                changePercent: 12.5,
            },
            topCustomers: [
                { rank: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', orderCount: 45, totalSpent: 18500000 },
                { rank: 2, name: 'Trần Thị B', email: 'tranthib@email.com', orderCount: 38, totalSpent: 16200000 },
                { rank: 3, name: 'Lê Văn C', email: 'levanc@email.com', orderCount: 32, totalSpent: 14300000 },
                { rank: 4, name: 'Phạm Thị D', email: 'phamthid@email.com', orderCount: 28, totalSpent: 12100000 },
                { rank: 5, name: 'Hoàng Văn E', email: 'hoangvane@email.com', orderCount: 25, totalSpent: 9800000 },
            ],
            topProducts: [
                { rank: 1, name: 'Sản phẩm Alpha', sku: 'SP-001', quantitySold: 320, revenue: 25600000 },
                { rank: 2, name: 'Sản phẩm Beta', sku: 'SP-002', quantitySold: 285, revenue: 19950000 },
                { rank: 3, name: 'Sản phẩm Gamma', sku: 'SP-003', quantitySold: 240, revenue: 16800000 },
                { rank: 4, name: 'Sản phẩm Delta', sku: 'SP-004', quantitySold: 210, revenue: 14700000 },
                { rank: 5, name: 'Sản phẩm Epsilon', sku: 'SP-005', quantitySold: 195, revenue: 13650000 },
                { rank: 6, name: 'Sản phẩm Zeta', sku: 'SP-006', quantitySold: 180, revenue: 12600000 },
                { rank: 7, name: 'Sản phẩm Eta', sku: 'SP-007', quantitySold: 165, revenue: 11550000 },
                { rank: 8, name: 'Sản phẩm Theta', sku: 'SP-008', quantitySold: 150, revenue: 10500000 },
                { rank: 9, name: 'Sản phẩm Iota', sku: 'SP-009', quantitySold: 140, revenue: 9800000 },
                { rank: 10, name: 'Sản phẩm Kappa', sku: 'SP-010', quantitySold: 128, revenue: 8960000 },
            ],
        };
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return {
            revenue: { total: 0, period: 'tháng này', changePercent: 0 },
            topCustomers: [],
            topProducts: [],
        };
    }
};
