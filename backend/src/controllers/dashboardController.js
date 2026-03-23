import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import { getManagerAllowedLocationIds } from '../libs/managerLocationHelper.js';

/**
 * Tính khoảng thời gian theo period (week|month) hoặc dateFrom/dateTo
 */
const getDateRange = (period, dateFrom, dateTo) => {
    const now = new Date();
    let start, end, periodLabel;
    if (dateFrom && dateTo) {
        start = new Date(dateFrom);
        start.setHours(0, 0, 0, 0);
        end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        periodLabel = `${dateFrom} - ${dateTo}`;
    } else if (period === 'week') {
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start = new Date(now);
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        periodLabel = 'tuần này';
    } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        periodLabel = 'tháng này';
    }
    return { start, end, periodLabel };
};

/**
 * GET /api/dashboard/stats – Thống kê tổng quan (Admin/Manager).
 * Query: period, dateFrom, dateTo, locationId. Manager: chỉ location được phân công.
 */
export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user?._id;
        const period = req.query.period || 'month';
        const dateFrom = req.query.dateFrom || '';
        const dateTo = req.query.dateTo || '';
        let locationId = req.query.locationId || '';
        const allowAll = !locationId || locationId === 'all';
        const allowedIds = await getManagerAllowedLocationIds(userId);
        if (allowedIds !== null) {
            if (allowedIds.length === 0) {
                return res.status(403).json({
                    message: 'Bạn chưa được phân công chi nhánh. Vui lòng liên hệ quản trị viên.',
                });
            }
            if (!locationId || locationId === 'all') {
                locationId = '';
            } else if (!allowedIds.includes(locationId.toString())) {
                return res.status(403).json({
                    message: 'Bạn không có quyền xem thống kê chi nhánh này. Chỉ được xem chi nhánh được phân công.',
                });
            }
        } else if (allowAll) {
            locationId = '';
        }

        const { start, end, periodLabel } = getDateRange(period, dateFrom, dateTo);

        let locationFilter = {};
        if (locationId && locationId !== 'all' && mongoose.Types.ObjectId.isValid(locationId)) {
            locationFilter = { location: new mongoose.Types.ObjectId(locationId) };
        } else if (allowedIds !== null && allowedIds.length > 0 && allowAll) {
            locationFilter = { location: { $in: allowedIds.map((id) => new mongoose.Types.ObjectId(id)) } };
        }
        const dateFilter = { createdAt: { $gte: start, $lte: end } };
        /** Doanh thu: đơn đã thanh toán. Ưu tiên paidAt; nếu chưa có paidAt thì dùng createdAt. */
        const dateRangePaid = { $gte: start, $lte: end };
        const dateFilterPaid = {
            ...locationFilter,
            paymentStatus: 'paid',
            $or: [
                { paidAt: dateRangePaid },
                { paidAt: null, createdAt: dateRangePaid },
                { paidAt: { $exists: false }, createdAt: dateRangePaid },
            ],
        };
        const dateFilterWithLoc = { ...dateFilter, ...locationFilter };

        const currentLocation = locationId && mongoose.Types.ObjectId.isValid(locationId)
            ? await Location.findById(locationId).lean()
            : null;
        const isOnlineBranch = !!currentLocation?.isOnlineLocation;

        const periodMs = end - start;
        const startOfPrev = new Date(start.getTime() - periodMs - 1);
        const endOfPrev = new Date(start.getTime() - 1);
        const prevPeriodFilter = {
            ...locationFilter,
            paymentStatus: 'paid',
            $or: [
                { paidAt: { $gte: startOfPrev, $lte: endOfPrev } },
                { paidAt: null, createdAt: { $gte: startOfPrev, $lte: endOfPrev } },
                { paidAt: { $exists: false }, createdAt: { $gte: startOfPrev, $lte: endOfPrev } },
            ],
        };

        const baseAggregations = [
            Order.aggregate([
                { $match: dateFilterPaid },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: prevPeriodFilter },
                { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
        ];

        const channelAggregations = isOnlineBranch
            ? [
                Order.aggregate([
                    { $match: { ...dateFilterPaid, channel: 'online' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
                ]),
                Order.aggregate([
                    { $match: { ...dateFilterPaid, channel: 'in_store' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
                ]),
            ]
            : [];

        const [
            revenueCurr,
            revenuePrev,
            ...revenueByChannel
        ] = await Promise.all([
            ...baseAggregations,
            ...channelAggregations,
        ]);

        const [
            ordersByStatus,
            pendingCount,
            totalCustomers,
            totalProducts,
            topCustomersAgg,
            topProductsAgg,
        ] = await Promise.all([
            Order.aggregate([
                { $match: dateFilterWithLoc },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Order.countDocuments({
                ...dateFilterWithLoc,
                status: 'pending',
                paymentStatus: 'pending',
            }),
            Customer.countDocuments({ isDeleted: { $ne: true } }),
            Product.countDocuments({ isDeleted: { $ne: true } }),
            Order.aggregate([
                { $match: dateFilterPaid },
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
                { $match: dateFilterPaid },
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

        const revenueOnline = isOnlineBranch && revenueByChannel[0] ? (revenueByChannel[0][0]?.total ?? 0) : null;
        const revenueOffline = isOnlineBranch && revenueByChannel[1] ? (revenueByChannel[1][0]?.total ?? 0) : null;

        const totalCurr = revenueCurr[0]?.total ?? 0;
        const totalPrev = revenuePrev[0]?.total ?? 0;
        const paidOrderCount = revenueCurr[0]?.count ?? 0;
        let changePercent = 0;
        if (totalPrev > 0) {
            changePercent = Math.round(((totalCurr - totalPrev) / totalPrev) * 1000) / 10;
        } else if (totalCurr > 0) {
            changePercent = 100;
        }

        const ordersByStatusMap = Object.fromEntries(
            (ordersByStatus || []).map((x) => [x._id, x.count])
        );

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
                locationId: locationId || null,
                revenue: {
                    total: totalCurr,
                    period: periodLabel,
                    changePercent,
                    ...(isOnlineBranch && {
                        revenueOnline: revenueOnline ?? 0,
                        revenueOffline: revenueOffline ?? 0,
                    }),
                },
                ordersByStatus: {
                    pending: ordersByStatusMap.pending ?? 0,
                    completed: (ordersByStatusMap.completed ?? 0) + (ordersByStatusMap.confirmed ?? 0) + (ordersByStatusMap.paid ?? 0),
                    cancelled: ordersByStatusMap.cancelled ?? 0,
                },
                paidOrderCount,
                pendingCount,
                totalCustomers,
                totalProducts,
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
