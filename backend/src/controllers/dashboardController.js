import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Location from '../models/Location.js';
import BatteryTradeIn from '../models/BatteryTradeIn.js';
import { getManagerAllowedLocationIds } from '../libs/managerLocationHelper.js';

const DEBUG_DASHBOARD = process.env.DEBUG_DASHBOARD === 'true';

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
 * GET /api/dashboard/chart-data – Data cho biểu đồ (Admin/Manager).
 * Query: period, locationId.
 */
export const getDashboardChartData = async (req, res) => {
    try {
        const userId = req.user?._id;
        const period = req.query.period || 'month';
        let locationId = req.query.locationId || '';
        const allowAll = !locationId || locationId === 'all';
        const allowedIds = await getManagerAllowedLocationIds(userId);

        if (allowedIds !== null && allowedIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    dailyRevenue: [],
                    invoiceDistribution: [
                        { name: 'Bán POS', value: 0, count: 0 },
                        { name: 'Thu cũ', value: 0, count: 0 },
                        { name: 'Bán Online', value: 0, count: 0 },
                    ],
                    summary: { totalRevenue: 0, totalOrders: 0, totalTradeIn: 0 },
                },
            });
        }

        if (allowedIds !== null) {
            if (!locationId || locationId === 'all') {
                locationId = '';
            } else if (!allowedIds.includes(locationId.toString())) {
                return res.status(403).json({ message: 'Không có quyền xem chi nhánh này.' });
            }
        } else if (allowAll) {
            locationId = '';
        }

        const now = new Date();
        let start, daysInRange;
        
        if (period === 'week') {
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1;
            start = new Date(now);
            start.setDate(now.getDate() - diff);
            start.setHours(0, 0, 0, 0);
            daysInRange = 7;
        } else {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            daysInRange = now.getDate();
        }

        let locationMatch = {};
        if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
            locationMatch = { location: new mongoose.Types.ObjectId(locationId) };
        } else if (allowedIds !== null && allowedIds.length > 0 && allowAll) {
            locationMatch = { location: { $in: allowedIds.map((id) => new mongoose.Types.ObjectId(id)) } };
        }

        let batteryLocationMatch = {};
        if (locationId && mongoose.Types.ObjectId.isValid(locationId)) {
            batteryLocationMatch = { locationId: new mongoose.Types.ObjectId(locationId) };
        } else if (allowedIds !== null && allowedIds.length > 0 && allowAll) {
            batteryLocationMatch = { locationId: { $in: allowedIds.map((id) => new mongoose.Types.ObjectId(id)) } };
        }

        // Data doanh thu theo ngày - dùng $expr để xử lý null đúng cách
        const dailyRevenueAgg = await Order.aggregate([
            {
                $match: {
                    ...locationMatch,
                    paymentStatus: 'paid',
                    $expr: {
                        $let: {
                            vars: {
                                effectiveDate: { $ifNull: ['$paidAt', '$createdAt'] },
                            },
                            in: {
                                $and: [
                                    { $gte: ['$$effectiveDate', start] },
                                    { $lte: ['$$effectiveDate', now] },
                                ],
                            },
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$paidAt', '$createdAt'] }, timezone: '+07:00' },
                    },
                    revenue: { $sum: '$totalAmount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Data thu cũ theo ngày
        const dailyBatteryAgg = await BatteryTradeIn.aggregate([
            {
                $match: {
                    ...batteryLocationMatch,
                    status: 'completed',
                    completedAmount: { $gt: 0 },
                    completedAt: { $gte: start, $lte: now },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
                    amount: { $sum: '$completedAmount' },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Data phân bổ theo loại hóa đơn
        const [ordersAgg, batteryAgg, onlineAgg, offlineAgg] = await Promise.all([
            // Bán hàng (POS/Offline)
            Order.aggregate([
                {
                    $match: {
                        ...locationMatch,
                        paymentStatus: 'paid',
                        channel: { $ne: 'online' },
                        $expr: {
                            $let: {
                                vars: {
                                    effectiveDate: { $ifNull: ['$paidAt', '$createdAt'] },
                                },
                                in: {
                                    $and: [
                                        { $gte: ['$$effectiveDate', start] },
                                        { $lte: ['$$effectiveDate', now] },
                                    ],
                                },
                            },
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
            // Thu cũ
            BatteryTradeIn.aggregate([
                {
                    $match: {
                        ...batteryLocationMatch,
                        status: 'completed',
                        completedAmount: { $gt: 0 },
                        completedAt: { $gte: start, $lte: now },
                    },
                },
                { $group: { _id: null, total: { $sum: '$completedAmount' }, count: { $sum: 1 } } },
            ]),
            // Bán Online
            Order.aggregate([
                {
                    $match: {
                        ...locationMatch,
                        paymentStatus: 'paid',
                        channel: 'online',
                        $expr: {
                            $let: {
                                vars: {
                                    effectiveDate: { $ifNull: ['$paidAt', '$createdAt'] },
                                },
                                in: {
                                    $and: [
                                        { $gte: ['$$effectiveDate', start] },
                                        { $lte: ['$$effectiveDate', now] },
                                    ],
                                },
                            },
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
            ]),
        ]);

        // Build daily revenue chart data
        const dailyRevenueMap = new Map(dailyRevenueAgg.map((d) => [d._id, d.revenue]));
        const dailyBatteryMap = new Map(dailyBatteryAgg.map((d) => [d._id, d.amount]));
        const dailyRevenue = [];
        
        const getLocalDateStr = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };
        
        for (let i = 0; i < daysInRange; i++) {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            const dateStr = getLocalDateStr(date);
            const dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            const label = period === 'week'
                ? dayLabels[date.getDay()]
                : `${date.getDate()}/${date.getMonth() + 1}`;
            
            dailyRevenue.push({
                date: dateStr,
                label,
                revenue: dailyRevenueMap.get(dateStr) || 0,
                batteryTradeIn: dailyBatteryMap.get(dateStr) || 0,
            });
        }

        // Phân bổ theo loại hóa đơn
        const revenuePOS = ordersAgg[0]?.total || 0;
        const revenueBattery = batteryAgg[0]?.total || 0;
        const revenueOnline = onlineAgg[0]?.total || 0;
        const totalInvoiceRevenue = revenuePOS + revenueBattery + revenueOnline;

        const invoiceDistribution = [
            { name: 'Bán POS', value: revenuePOS, count: ordersAgg[0]?.count || 0 },
            { name: 'Thu cũ', value: revenueBattery, count: batteryAgg[0]?.count || 0 },
            { name: 'Bán Online', value: revenueOnline, count: onlineAgg[0]?.count || 0 },
        ];

        if (DEBUG_DASHBOARD) {
            console.log('[Chart Data Debug]', {
                period,
                start: start.toISOString(),
                end: now.toISOString(),
                daysInRange,
                dailyRevenueAggCount: dailyRevenueAgg.length,
                dailyRevenueAgg: dailyRevenueAgg.slice(0, 3),
                ordersAgg,
                batteryAgg,
                onlineAgg,
                invoiceDistribution,
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                dailyRevenue,
                invoiceDistribution,
                summary: {
                    totalRevenue: totalInvoiceRevenue,
                    totalOrders: (ordersAgg[0]?.count || 0) + (onlineAgg[0]?.count || 0),
                    totalTradeIn: batteryAgg[0]?.count || 0,
                },
            },
        });
    } catch (error) {
        console.error('getDashboardChartData error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy dữ liệu biểu đồ',
            error: error.message,
        });
    }
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

        let batteryLocationMatch = {};
        if (locationId && locationId !== 'all' && mongoose.Types.ObjectId.isValid(locationId)) {
            batteryLocationMatch = { locationId: new mongoose.Types.ObjectId(locationId) };
        } else if (allowedIds !== null && allowedIds.length > 0 && allowAll) {
            batteryLocationMatch = {
                locationId: { $in: allowedIds.map((id) => new mongoose.Types.ObjectId(id)) },
            };
        }

        const batteryDateCurr = {
            status: 'completed',
            completedAmount: { $gt: 0 },
            completedAt: { $gte: start, $lte: end },
            ...batteryLocationMatch,
        };
        const batteryDatePrev = {
            status: 'completed',
            completedAmount: { $gt: 0 },
            completedAt: { $gte: startOfPrev, $lte: endOfPrev },
            ...batteryLocationMatch,
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
            BatteryTradeIn.aggregate([
                { $match: batteryDateCurr },
                { $group: { _id: null, total: { $sum: '$completedAmount' }, count: { $sum: 1 } } },
            ]),
            BatteryTradeIn.aggregate([
                { $match: batteryDatePrev },
                { $group: { _id: null, total: { $sum: '$completedAmount' } } },
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
            batteryCurr,
            batteryPrev,
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

        const grossSalesCurr = revenueCurr[0]?.total ?? 0;
        const grossSalesPrev = revenuePrev[0]?.total ?? 0;
        const tradeInExpenseCurr = batteryCurr[0]?.total ?? 0;
        const tradeInExpensePrev = batteryPrev[0]?.total ?? 0;

        /** Thu cũ là khoản chi mua lại ắc quy cũ từ khách => trừ khỏi doanh thu bán hàng để ra doanh thu thuần. */
        const netSalesCurr = grossSalesCurr - tradeInExpenseCurr;
        const netSalesPrev = grossSalesPrev - tradeInExpensePrev;
        const paidOrderCount = revenueCurr[0]?.count ?? 0;
        let changePercent = 0;
        if (netSalesPrev > 0) {
            changePercent = Math.round(((netSalesCurr - netSalesPrev) / netSalesPrev) * 1000) / 10;
        } else if (netSalesCurr > 0) {
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
                    total: netSalesCurr,
                    period: periodLabel,
                    changePercent,
                    grossSales: grossSalesCurr,
                    tradeInExpense: tradeInExpenseCurr,
                    netSales: netSalesCurr,
                    revenueOrders: grossSalesCurr,
                    revenueBatteryTradeIn: tradeInExpenseCurr,
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
