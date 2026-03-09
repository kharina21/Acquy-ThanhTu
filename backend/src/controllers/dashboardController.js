import Order from '../models/Order.js';

/**
 * GET /api/dashboard/stats – Thống kê tổng quan (Admin/Manager).
 * Doanh thu, top khách hàng, top sản phẩm từ Order.
 */
export const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        const period = 'tháng này';

        const [revenueThisMonth, revenueLastMonth, topCustomersAgg, topProductsAgg] = await Promise.all([
            Order.aggregate([
                { $match: { paymentStatus: 'paid', createdAt: { $gte: startOfMonth } } },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Order.aggregate([
                {
                    $match: {
                        paymentStatus: 'paid',
                        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: '$customer', orderCount: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
                { $sort: { totalSpent: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user',
                        pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, username: 1 } }],
                    },
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            ]),
            Order.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product',
                        quantitySold: { $sum: '$items.quantity' },
                        revenue: { $sum: '$items.total' },
                    },
                },
                { $sort: { quantitySold: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'product',
                        pipeline: [{ $project: { name: 1, sku: 1 } }],
                    },
                },
                { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            ]),
        ]);

        const totalThisMonth = revenueThisMonth[0]?.total ?? 0;
        const totalLastMonth = revenueLastMonth[0]?.total ?? 0;
        let changePercent = 0;
        if (totalLastMonth > 0) {
            changePercent = Math.round(((totalThisMonth - totalLastMonth) / totalLastMonth) * 1000) / 10;
        } else if (totalThisMonth > 0) {
            changePercent = 100;
        }

        const topCustomers = topCustomersAgg.map((c, i) => ({
            rank: i + 1,
            name: c.user
                ? [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || c.user.username || '—'
                : 'Khách vãng lai',
            email: c.user?.email || '—',
            orderCount: c.orderCount,
            totalSpent: c.totalSpent,
        }));

        const topProducts = topProductsAgg.map((p, i) => ({
            rank: i + 1,
            name: p.product?.name || 'Sản phẩm đã xóa',
            sku: p.product?.sku || '—',
            quantitySold: p.quantitySold,
            revenue: p.revenue,
        }));

        return res.status(200).json({
            success: true,
            data: {
                revenue: {
                    total: totalThisMonth,
                    period,
                    changePercent,
                },
                topCustomers,
                topProducts,
            },
        });
    } catch (error) {
        console.error('getDashboardStats error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy thống kê',
            error: error.message,
        });
    }
};
