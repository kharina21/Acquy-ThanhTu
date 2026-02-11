import Product from '../models/Product.js';

/**
 * Manager API - Dashboard và Reports
 * Chỉ dành cho role manager, filter theo locationId (chi nhánh)
 *
 * Lưu ý: Chưa có Order model → dùng dữ liệu từ Product/ProductStock/StockCheck
 * hoặc mock. Khi có Order, cập nhật logic aggregate thật.
 */

/**
 * GET /api/manager/dashboard
 * Thống kê tổng quan cho manager (theo chi nhánh nếu có)
 */
export const getDashboard = async (req, res) => {
    try {
        const locationId = req.query.locationId || null;

        // TODO: Khi có Order, aggregate từ Order theo locationId
        // Hiện dùng dữ liệu mẫu tương thích frontend
        const revenue = {
            total: 125000000,
            period: 'tháng này',
            changePercent: 12.5,
        };
        const topCustomers = [
            { rank: 1, name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', orderCount: 45, totalSpent: 18500000 },
            { rank: 2, name: 'Trần Thị B', email: 'tranthib@email.com', orderCount: 38, totalSpent: 16200000 },
            { rank: 3, name: 'Lê Văn C', email: 'levanc@email.com', orderCount: 32, totalSpent: 14300000 },
            { rank: 4, name: 'Phạm Thị D', email: 'phamthid@email.com', orderCount: 28, totalSpent: 12100000 },
            { rank: 5, name: 'Hoàng Văn E', email: 'hoangvane@email.com', orderCount: 25, totalSpent: 9800000 },
        ];

        // Top products: có thể lấy từ Product nếu có soldQuantity hoặc mock
        let topProducts = [];
        try {
            const products = await Product.find({ isActive: { $ne: false } })
                .select('name sku totalStock')
                .sort({ totalStock: -1 })
                .limit(10)
                .lean();
            topProducts = products.map((p, i) => ({
                rank: i + 1,
                name: p.name,
                sku: p.sku || '-',
                quantitySold: p.totalStock || 0,
                revenue: (p.totalStock || 0) * 50000,
            }));
        } catch {
            topProducts = [
                { rank: 1, name: 'Sản phẩm Alpha', sku: 'SP-001', quantitySold: 320, revenue: 25600000 },
                { rank: 2, name: 'Sản phẩm Beta', sku: 'SP-002', quantitySold: 285, revenue: 19950000 },
                { rank: 3, name: 'Sản phẩm Gamma', sku: 'SP-003', quantitySold: 240, revenue: 16800000 },
            ];
        }

        if (topProducts.length === 0) {
            topProducts = [
                { rank: 1, name: 'Chưa có dữ liệu', sku: '-', quantitySold: 0, revenue: 0 },
            ];
        }

        res.status(200).json({
            revenue,
            topCustomers,
            topProducts,
            locationId,
        });
    } catch (error) {
        console.error('getDashboard error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thống kê dashboard', error: error.message });
    }
};

/**
 * GET /api/manager/reports/end-of-day
 * Báo cáo cuối ngày
 */
export const getReportEndOfDay = async (req, res) => {
    try {
        const locationId = req.query.locationId || null;
        const date = req.query.date || new Date().toISOString().slice(0, 10);

        // TODO: Khi có Order, aggregate theo ngày + locationId
        const report = {
            date,
            locationId,
            summary: {
                totalOrders: 45,
                totalRevenue: 12500000,
                totalItemsSold: 320,
            },
            details: [],
        };

        res.status(200).json(report);
    } catch (error) {
        console.error('getReportEndOfDay error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo cuối ngày', error: error.message });
    }
};

/**
 * GET /api/manager/reports/sales
 * Báo cáo doanh số
 */
export const getReportSales = async (req, res) => {
    try {
        const locationId = req.query.locationId || null;
        const from = req.query.from || new Date().toISOString().slice(0, 10);
        const to = req.query.to || new Date().toISOString().slice(0, 10);

        // TODO: Khi có Order, aggregate theo khoảng thời gian + locationId
        const report = {
            from,
            to,
            locationId,
            summary: {
                totalRevenue: 125000000,
                totalOrders: 450,
                changePercent: 12.5,
            },
            dailyData: [],
        };

        res.status(200).json(report);
    } catch (error) {
        console.error('getReportSales error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo doanh số', error: error.message });
    }
};

/**
 * GET /api/manager/reports/best-selling
 * Báo cáo sản phẩm bán chạy
 */
export const getReportBestSelling = async (req, res) => {
    try {
        const locationId = req.query.locationId || null;
        const from = req.query.from || null;
        const to = req.query.to || null;

        let products = await Product.find({ isActive: { $ne: false } })
            .select('name sku totalStock')
            .sort({ totalStock: -1 })
            .limit(20)
            .lean();

        const items = products.map((p, i) => ({
            rank: i + 1,
            name: p.name,
            sku: p.sku || '-',
            quantitySold: p.totalStock || 0,
            revenue: (p.totalStock || 0) * 50000,
        }));

        res.status(200).json({
            locationId,
            from,
            to,
            items,
        });
    } catch (error) {
        console.error('getReportBestSelling error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy báo cáo sản phẩm bán chạy', error: error.message });
    }
};
