import mongoose from 'mongoose';
import Warranty from '../models/Warranty.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import Location from '../models/Location.js';
import { addMonths } from '../utils/parseWarrantyText.js';
import { sendWarrantyClaimConfirmationEmail, sendWarrantyClaimStatusUpdateEmail } from '../libs/emailHelper.js';
import { validateLocationForUser, getManagerAllowedLocationIds } from '../libs/managerLocationHelper.js';
import { userHasEquivalentRole } from '../utils/roleEquivalence.js';

/**
 * Sinh mã bảo hành.
 */
const generateWarrantyCode = async () => Warranty.generateWarrantyCode();

/**
 * Sinh mã yêu cầu BH.
 */
const generateClaimCode = async () => Warranty.generateClaimCode();

// ────────────────────────────────────────────────────────────────────────
// 1. Tra cứu bảo hành bằng mã hóa đơn (Public)
// GET /api/warranties/lookup/:orderCode
// ────────────────────────────────────────────────────────────────────────
export const lookupWarrantyByOrderCode = async (req, res) => {
    try {
        const { orderCode } = req.params;

        if (!orderCode || typeof orderCode !== 'string' || orderCode.trim().length < 3) {
            return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ' });
        }

        const now = new Date();

        const order = await Order.findOne({ code: orderCode.trim() })
            .populate('customerProfile', 'name phone type')
            .populate('items.product', 'sku name image warrantyYears warrantyMonths warrantyText')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn với mã này' });
        }

        const warranties = await Warranty.find({
            orderCode: orderCode.trim(),
            isDeleted: false,
        })
            .populate('productId', 'sku name image')
            .lean();

        const warrantyMap = {};
        for (const w of warranties) {
            const pid = w.productId?._id?.toString();
            if (pid) warrantyMap[pid] = w;
        }

        const warrantyResults = (order.items || []).map((item) => {
            const w = warrantyMap[item.product?._id?.toString()];
            if (!w) {
                return {
                    _id: null,
                    warrantyCode: null,
                    product: {
                        _id: item.product?._id,
                        sku: item.product?.sku || '',
                        name: item.product?.name || '',
                        image: item.product?.image || '',
                    },
                    warrantyText: item.product?.warrantyText || '',
                    warrantyMonths: (item.product?.warrantyYears || 0) * 12 + (item.product?.warrantyMonths || 0),
                    hasWarrantyRecord: false,
                    purchaseDate: order.createdAt,
                    warrantyStartDate: null,
                    warrantyEndDate: null,
                    status: 'no_warranty_record',
                    isExpired: false,
                };
            }

            const isExpired = new Date(w.warrantyEndDate) < now;
            return {
                _id: w._id,
                warrantyCode: w.warrantyCode,
                product: {
                    _id: w.productId?._id,
                    sku: w.productSnapshot?.sku || w.productId?.sku || '',
                    name: w.productSnapshot?.name || w.productId?.name || '',
                    image: w.productSnapshot?.image || w.productId?.image || '',
                },
                warrantyText: w.productSnapshot?.warrantyText || '',
                warrantyMonths: w.warrantyMonths,
                hasWarrantyRecord: true,
                purchaseDate: w.purchaseDate,
                warrantyStartDate: w.warrantyStartDate,
                warrantyEndDate: w.warrantyEndDate,
                status: isExpired ? 'expired' : w.status,
                isExpired,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                order: {
                    code: order.code,
                    purchaseDate: order.createdAt,
                    totalAmount: order.totalAmount,
                    channel: order.channel,
                    status: order.status,
                    paymentStatus: order.paymentStatus,
                    customerName: order.customerProfile?.name || '',
                    customerPhone: order.customerProfile?.phone || '',
                    items: (order.items || []).map((item) => ({
                        productId: item.product?._id,
                        sku: item.product?.sku || '',
                        name: item.product?.name || '',
                        image: item.product?.image || '',
                        quantity: item.quantity,
                        price: item.price,
                        warrantyText: item.product?.warrantyText || '',
                        warrantyMonths:
                            (item.product?.warrantyYears || 0) * 12 + (item.product?.warrantyMonths || 0),
                    })),
                },
                warranties: warrantyResults,
            },
        });
    } catch (error) {
        console.error('lookupWarrantyByOrderCode error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi tra cứu bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 3. Chi tiết một bảo hành
// GET /api/warranties/:id
// ────────────────────────────────────────────────────────────────────────
export const getWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bảo hành không hợp lệ' });
        }

        const warranty = await Warranty.findOne({ _id: id, isDeleted: false })
            .populate('productId', 'sku name image')
            .populate('orderId', 'code createdAt')
            .populate('customerId', 'name phone type')
            .populate('locationId', 'code name address phone')
            .lean();

        if (!warranty) {
            return res.status(404).json({ message: 'Không tìm thấy bảo hành' });
        }

        const now = new Date();
        const isExpired = new Date(warranty.warrantyEndDate) < now;
        const hasPendingClaim = warranty.claims?.some((c) => c.status === 'pending') ?? false;

        return res.status(200).json({
            success: true,
            data: {
                ...warranty,
                isExpired,
                canClaim: !isExpired && !hasPendingClaim,
                hasPendingClaim,
                location: warranty.locationId,
            },
        });
    } catch (error) {
        console.error('getWarrantyById error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy chi tiết bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 4. Danh sách bảo hành (Admin/Manager)
// GET /api/warranties
// Query: page, limit, status, orderCode, productId, customerId, dateFrom, dateTo, locationId
// ────────────────────────────────────────────────────────────────────────
export const getWarranties = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            orderCode,
            productId,
            customerId,
            dateFrom,
            dateTo,
            locationId,
        } = req.query;

        const filter = { isDeleted: false };

        // Phân quyền theo chi nhánh
        const user = await User.findById(req.user._id).populate('roles', 'name').lean();
        const roleNames = user?.roles?.map((r) => r.name) || [];
        const isAdmin = roleNames.includes('admin');

        if (!isAdmin) {
            // Non-admin: chỉ xem được bảo hành tại chi nhánh được phân
            const { allowedIds } = await validateLocationForUser(req.user._id, null);
            if (allowedIds === null) {
                // User có role nhưng không có Employee record
                filter.locationId = { $in: [] };
            } else if (allowedIds.length > 0) {
                filter.locationId = { $in: allowedIds };
            } else {
                filter.locationId = { $in: [] };
            }
        } else if (locationId) {
            // Admin: có thể filter theo location cụ thể
            filter.locationId = new mongoose.Types.ObjectId(locationId);
        }

        if (status) {
            if (status === 'active') {
                filter.warrantyEndDate = { $gt: new Date() };
                filter.status = 'active';
            } else if (status === 'expired') {
                filter.warrantyEndDate = { $lte: new Date() };
            } else {
                filter.status = status;
            }
        }

        if (orderCode) {
            filter.orderCode = { $regex: orderCode, $options: 'i' };
        }

        if (productId && mongoose.Types.ObjectId.isValid(productId)) {
            filter.productId = new mongoose.Types.ObjectId(productId);
        }

        if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
            filter.customerId = new mongoose.Types.ObjectId(customerId);
        }

        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) {
                filter.purchaseDate = { ...filter.purchaseDate, $gte: from };
            }
        }
        if (dateTo) {
            const to = new Date(dateTo);
            if (!isNaN(to.getTime())) {
                to.setHours(23, 59, 59, 999);
                filter.purchaseDate = { ...filter.purchaseDate, $lte: to };
            }
        }

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const now = new Date();

        const [warranties, total] = await Promise.all([
            Warranty.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('productId', 'sku name image')
                .populate('orderId', 'code createdAt')
                .populate('customerId', 'name phone')
                .populate('locationId', 'code name address')
                .lean(),
            Warranty.countDocuments(filter),
        ]);

        const enriched = warranties.map((w) => {
            const isExpired = new Date(w.warrantyEndDate) < now;
            const hasPendingClaim = w.claims?.some((c) => c.status === 'pending') ?? false;
            const latestClaim = w.claims?.length
                ? w.claims.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                : null;

            return {
                _id: w._id,
                warrantyCode: w.warrantyCode,
                orderCode: w.orderCode,
                purchaseDate: w.purchaseDate,
                warrantyStartDate: w.warrantyStartDate,
                warrantyEndDate: w.warrantyEndDate,
                warrantyMonths: w.warrantyMonths,
                warrantyText: w.productSnapshot?.warrantyText || '',
                status: isExpired ? 'expired' : w.status,
                isExpired,
                canClaim: !isExpired && !hasPendingClaim,
                hasPendingClaim,
                claimsCount: w.claims?.length || 0,
                latestClaim,
                product: {
                    _id: w.productId?._id,
                    sku: w.productSnapshot?.sku || w.productId?.sku || '',
                    name: w.productSnapshot?.name || w.productId?.name || '',
                    image: w.productSnapshot?.image || w.productId?.image || '',
                },
                customer: {
                    _id: w.customerId?._id,
                    name: w.customerName || w.customerId?.name || '',
                    phone: w.customerPhone || w.customerId?.phone || '',
                },
                order: {
                    _id: w.orderId?._id,
                    code: w.orderId?.code || w.orderCode,
                    createdAt: w.orderId?.createdAt,
                },
                location: {
                    _id: w.locationId?._id,
                    code: w.locationId?.code || '',
                    name: w.locationId?.name || '',
                    address: w.locationId?.address || '',
                },
                createdAt: w.createdAt,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                warranties: enriched,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('getWarranties error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 5. Danh sách TẤT CẢ yêu cầu bảo hành (cho Admin – flatten claims)
// GET /api/warranties/claims
// Query: page, limit, claimStatus, reason, orderCode, dateFrom, dateTo, search, locationId
// ────────────────────────────────────────────────────────────────────────
export const getAllClaims = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            claimStatus,
            reason,
            orderCode,
            dateFrom,
            dateTo,
            search,
            locationId,
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

        // Build match filter
        const matchFilter = { isDeleted: false };

        // Phân quyền theo chi nhánh
        const user = await User.findById(req.user._id).populate('roles', 'name').lean();
        const roleNames = user?.roles?.map((r) => r.name) || [];
        const isAdmin = roleNames.includes('admin');

        if (!isAdmin) {
            const { allowedIds } = await validateLocationForUser(req.user._id, null);
            if (allowedIds === null) {
                matchFilter.locationId = { $in: [] };
            } else if (allowedIds.length > 0) {
                matchFilter.locationId = { $in: allowedIds };
            } else {
                matchFilter.locationId = { $in: [] };
            }
        } else if (locationId) {
            matchFilter.locationId = new mongoose.Types.ObjectId(locationId);
        }

        if (orderCode) {
            matchFilter.orderCode = { $regex: orderCode, $options: 'i' };
        }
        if (dateFrom) {
            const from = new Date(dateFrom);
            if (!isNaN(from.getTime())) {
                matchFilter.purchaseDate = { $gte: from };
            }
        }
        if (dateTo) {
            const to = new Date(dateTo);
            if (!isNaN(to.getTime())) {
                to.setHours(23, 59, 59, 999);
                matchFilter.purchaseDate = { ...matchFilter.purchaseDate, $lte: to };
            }
        }

        // Aggregate: unwind claims
        const aggregateFilter = { ...matchFilter };
        if (claimStatus) {
            aggregateFilter['claims.status'] = claimStatus;
        }
        if (reason) {
            aggregateFilter['claims.reason'] = reason;
        }

        const skip = (pageNum - 1) * limitNum;

        const [warranties, countResult] = await Promise.all([
            Warranty.aggregate([
                { $match: aggregateFilter },
                { $unwind: { path: '$claims', preserveNullAndEmptyArrays: false } },
                // Filter claims further if claimStatus/reason was set
                ...(claimStatus ? [{ $match: { 'claims.status': claimStatus } }] : []),
                ...(reason ? [{ $match: { 'claims.reason': reason } }] : []),
                // Search trong claim + warranty info
                ...(search
                    ? [
                          {
                              $match: {
                                  $or: [
                                      { 'claims.claimCode': { $regex: search, $options: 'i' } },
                                      { 'claims.customerName': { $regex: search, $options: 'i' } },
                                      { 'claims.customerPhone': { $regex: search, $options: 'i' } },
                                      { warrantyCode: { $regex: search, $options: 'i' } },
                                      { orderCode: { $regex: search, $options: 'i' } },
                                  ],
                              },
                      },
                      ]
                    : []),
                { $sort: { 'claims.createdAt': -1 } },
                { $skip: skip },
                { $limit: limitNum },
                // Lookup order để lấy thông tin thêm
                {
                    $lookup: {
                        from: 'orders',
                        localField: 'orderId',
                        foreignField: '_id',
                        as: 'orderInfo',
                    },
                },
                { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
                // Lookup product
                {
                    $lookup: {
                        from: 'products',
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'productInfo',
                    },
                },
                { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
                // Lookup location
                {
                    $lookup: {
                        from: 'locations',
                        localField: 'locationId',
                        foreignField: '_id',
                        as: 'locationInfo',
                    },
                },
                { $unwind: { path: '$locationInfo', preserveNullAndEmptyArrays: true } },
                // Project fields
                {
                    $project: {
                        _id: 1,
                        warrantyCode: 1,
                        orderCode: 1,
                        purchaseDate: 1,
                        warrantyStartDate: 1,
                        warrantyEndDate: 1,
                        warrantyMonths: 1,
                        productSnapshot: 1,
                        customerName: 1,
                        customerPhone: 1,
                        'claims': 1,
                        'orderInfo.code': 1,
                        'orderInfo.createdAt': 1,
                        'productInfo.name': 1,
                        'productInfo.sku': 1,
                        'productInfo.image': 1,
                        'locationInfo.code': 1,
                        'locationInfo.name': 1,
                        'locationInfo.address': 1,
                    },
                },
            ]),
            Warranty.aggregate([
                { $match: matchFilter },
                { $unwind: { path: '$claims', preserveNullAndEmptyArrays: false } },
                ...(claimStatus ? [{ $match: { 'claims.status': claimStatus } }] : []),
                ...(reason ? [{ $match: { 'claims.reason': reason } }] : []),
                ...(search
                    ? [
                          {
                              $match: {
                                  $or: [
                                      { 'claims.claimCode': { $regex: search, $options: 'i' } },
                                      { 'claims.customerName': { $regex: search, $options: 'i' } },
                                      { 'claims.customerPhone': { $regex: search, $options: 'i' } },
                                      { warrantyCode: { $regex: search, $options: 'i' } },
                                      { orderCode: { $regex: search, $options: 'i' } },
                                  ],
                              },
                      },
                      ]
                    : []),
                { $count: 'total' },
            ]),
        ]);

        const total = countResult[0]?.total || 0;
        const now = new Date();

        const claims = warranties.map((w) => {
            const isExpired = new Date(w.warrantyEndDate) < now;
            return {
                warrantyId: w._id,
                warrantyCode: w.warrantyCode,
                orderCode: w.orderCode,
                orderCreatedAt: w.orderInfo?.createdAt,
                product: {
                    _id: w.productId,
                    name: w.productSnapshot?.name || w.productInfo?.name || '',
                    sku: w.productSnapshot?.sku || w.productInfo?.sku || '',
                    image: w.productSnapshot?.image || w.productInfo?.image || '',
                },
                purchaseDate: w.purchaseDate,
                warrantyStartDate: w.warrantyStartDate,
                warrantyEndDate: w.warrantyEndDate,
                warrantyMonths: w.warrantyMonths,
                isExpired,
                customerName: w.claims.customerName || w.customerName || '',
                customerPhone: w.claims.customerPhone || w.customerPhone || '',
                location: {
                    _id: w.locationId,
                    code: w.locationInfo?.code || '',
                    name: w.locationInfo?.name || '',
                    address: w.locationInfo?.address || '',
                },
                claim: {
                    claimCode: w.claims.claimCode,
                    reason: w.claims.reason,
                    description: w.claims.description,
                    images: w.claims.images,
                    customerAddress: w.claims.customerAddress,
                    notes: w.claims.notes,
                    status: w.claims.status,
                    createdAt: w.claims.createdAt,
                    resolvedAt: w.claims.resolvedAt,
                    resolutionNotes: w.claims.resolutionNotes,
                    resolvedBy: w.claims.resolvedBy,
                },
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                claims,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('getAllClaims error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách yêu cầu bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 6. Cập nhật trạng thái yêu cầu bảo hành (Admin/Manager/Seller/Staff)
// PUT /api/warranties/:id/claims/:claimCode
// Body: { status, resolutionNotes }
// ────────────────────────────────────────────────────────────────────────
export const updateWarrantyClaim = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id, claimCode } = req.params;
        const { status, resolutionNotes, reason, description, customerName, customerPhone, customerEmail, customerAddress, notes } = req.body || {};

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bảo hành không hợp lệ' });
        }

        const warranty = await Warranty.findOne({ _id: id, isDeleted: false });
        if (!warranty) {
            return res.status(404).json({ message: 'Không tìm thấy bảo hành' });
        }

        const claim = warranty.claims.find((c) => c.claimCode === claimCode);
        if (!claim) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu bảo hành' });
        }

        // Nếu có truyền status → cập nhật trạng thái
        if (status !== undefined) {
            const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
            }

            const oldStatus = claim.status;
            claim.status = status;
            if (resolutionNotes !== undefined) {
                claim.resolutionNotes = String(resolutionNotes).trim().slice(0, 1000);
            }

            if (['approved', 'rejected', 'completed'].includes(status)) {
                claim.resolvedAt = new Date();
                claim.resolvedBy = userId;
            }

            // Gửi email thông báo
            if (oldStatus !== status && status !== 'pending') {
                const customerEmailVal = claim.customerEmail || warranty.customerPhone;
                if (customerEmailVal && typeof customerEmailVal === 'string' && customerEmailVal.includes('@')) {
                    try {
                        await sendWarrantyClaimStatusUpdateEmail({
                            toEmail: customerEmailVal,
                            customerName: claim.customerName || warranty.customerName || 'Quý khách',
                            warrantyCode: warranty.warrantyCode,
                            claimCode: claim.claimCode,
                            productName: warranty.productSnapshot?.name || '',
                            oldStatus,
                            newStatus: status,
                            resolutionNotes: claim.resolutionNotes || '',
                        });
                    } catch (emailErr) {
                        console.error('Gửi email cập nhật trạng thái BH thất bại:', emailErr.message);
                    }
                }
            }
        }

        // Cập nhật các trường khác (sửa phiếu)
        if (reason !== undefined) {
            const validReasons = ['product_damage', 'product_defect', 'battery_leak', 'charging_issue', 'other'];
            if (!validReasons.includes(reason)) {
                return res.status(400).json({ message: 'Lý do bảo hành không hợp lệ' });
            }
            claim.reason = reason;
        }
        if (description !== undefined) claim.description = String(description).trim().slice(0, 1000);
        if (customerName !== undefined) claim.customerName = String(customerName).trim().slice(0, 100);
        if (customerPhone !== undefined) claim.customerPhone = String(customerPhone).trim().slice(0, 20);
        if (customerEmail !== undefined) claim.customerEmail = String(customerEmail).trim().slice(0, 100);
        if (customerAddress !== undefined) claim.customerAddress = String(customerAddress).trim().slice(0, 300);
        if (notes !== undefined) claim.notes = String(notes).trim().slice(0, 500);

        await warranty.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật yêu cầu bảo hành thành công',
            data: { claim },
        });
    } catch (error) {
        console.error('updateWarrantyClaim error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật yêu cầu bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 7. Lấy tất cả bảo hành của một Order (Admin)
// GET /api/warranties/order/:orderCode
// ────────────────────────────────────────────────────────────────────────
export const getWarrantiesByOrderCode = async (req, res) => {
    try {
        const { orderCode } = req.params;

        if (!orderCode || orderCode.trim().length < 3) {
            return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ' });
        }

        const warranties = await Warranty.find({
            orderCode: orderCode.trim(),
            isDeleted: false,
        })
            .populate('productId', 'sku name image')
            .lean();

        const now = new Date();
        const enriched = warranties.map((w) => {
            const isExpired = new Date(w.warrantyEndDate) < now;
            const hasPendingClaim = w.claims?.some((c) => c.status === 'pending') ?? false;

            return {
                ...w,
                isExpired,
                canClaim: !isExpired && !hasPendingClaim,
                hasPendingClaim,
            };
        });

        return res.status(200).json({
            success: true,
            data: { warranties: enriched },
        });
    } catch (error) {
        console.error('getWarrantiesByOrderCode error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy bảo hành theo hóa đơn',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 8. Thống kê bảo hành (Dashboard)
// GET /api/warranties/stats
// ────────────────────────────────────────────────────────────────────────
export const getWarrantyStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalActive,
            totalExpired,
            totalClaimed,
            pendingClaims,
            claimedThisMonth,
        ] = await Promise.all([
            Warranty.countDocuments({ isDeleted: false, warrantyEndDate: { $gt: now }, status: 'active' }),
            Warranty.countDocuments({ isDeleted: false, warrantyEndDate: { $lte: now } }),
            Warranty.countDocuments({ isDeleted: false, status: 'claimed' }),
            Warranty.countDocuments({
                isDeleted: false,
                'claims.status': 'pending',
            }),
            Warranty.countDocuments({
                isDeleted: false,
                'claims.createdAt': { $gte: startOfMonth },
            }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalActive,
                totalExpired,
                totalClaimed,
                pendingClaims,
                claimedThisMonth,
            },
        });
    } catch (error) {
        console.error('getWarrantyStats error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy thống kê bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 9. Thống kê phiếu yêu cầu bảo hành (Claims)
// GET /api/warranties/claims/stats
// ────────────────────────────────────────────────────────────────────────
export const getClaimStats = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Đếm số lượng claims theo từng trạng thái
        // Sử dụng aggregation để đếm claims trong tất cả warranties
        const [
            totalClaims,
            pendingClaims,
            approvedClaims,
            completedClaims,
            rejectedClaims,
            claimsThisMonth,
        ] = await Promise.all([
            // Tổng số claims
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $count: 'total' },
            ]),
            // Claims đang chờ xử lý
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $match: { 'claims.status': 'pending' } },
                { $count: 'pending' },
            ]),
            // Claims đã duyệt
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $match: { 'claims.status': 'approved' } },
                { $count: 'approved' },
            ]),
            // Claims hoàn thành
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $match: { 'claims.status': 'completed' } },
                { $count: 'completed' },
            ]),
            // Claims bị từ chối
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $match: { 'claims.status': 'rejected' } },
                { $count: 'rejected' },
            ]),
            // Claims trong tháng này
            Warranty.aggregate([
                { $match: { isDeleted: false } },
                { $unwind: '$claims' },
                { $match: { 'claims.createdAt': { $gte: startOfMonth } } },
                { $count: 'thisMonth' },
            ]),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalClaims: totalClaims[0]?.total || 0,
                pendingClaims: pendingClaims[0]?.pending || 0,
                approvedClaims: approvedClaims[0]?.approved || 0,
                completedClaims: completedClaims[0]?.completed || 0,
                rejectedClaims: rejectedClaims[0]?.rejected || 0,
                claimsThisMonth: claimsThisMonth[0]?.thisMonth || 0,
            },
        });
    } catch (error) {
        console.error('getClaimStats error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi lấy thống kê phiếu bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 10. Tạo phiếu bảo hành (Admin/Manager/Seller)
// POST /api/warranties/create-claim
// Body: { orderCode, productId, reason, description, customerName, customerPhone, customerEmail, customerAddress, notes, locationId }
// ────────────────────────────────────────────────────────────────────────
export const createWarrantyClaim = async (req, res) => {
    try {
        const userId = req.user?._id;
        const {
            orderCode,
            productId,
            reason,
            description,
            customerName,
            customerPhone,
            customerEmail,
            customerAddress,
            notes,
            locationId,
        } = req.body || {};

        // Kiểm tra role của user
        const user = await User.findById(userId).populate('roles', 'name').lean();
        const roleNames = user?.roles?.map((r) => r.name) || [];
        const isAdmin = roleNames.includes('admin');

        // Xác định locationId
        let resolvedLocationId = null;

        if (isAdmin) {
            // Admin: bắt buộc phải chọn cơ sở bảo hành
            if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
                return res.status(400).json({ message: 'Admin phải chọn cơ sở bảo hành' });
            }
            // Verify location tồn tại
            const location = await Location.findById(locationId).lean();
            if (!location) {
                return res.status(404).json({ message: 'Không tìm thấy cơ sở bảo hành' });
            }
            resolvedLocationId = new mongoose.Types.ObjectId(locationId);
        } else {
            // Manager/Seller: lấy cơ sở được phân của nhân viên
            console.log('[createWarrantyClaim] userId:', userId);
            
            const employee = await Employee.findOne({ user: userId, isDeleted: { $ne: true } }).lean();
            console.log('[createWarrantyClaim] employee:', employee);
            
            if (!employee) {
                return res.status(403).json({
                    message: 'Không tìm thấy thông tin nhân viên. Vui lòng liên hệ quản lý.',
                });
            }

            const { allowedIds } = await validateLocationForUser(userId, null);
            console.log('[createWarrantyClaim] allowedIds:', allowedIds);
            
            if (!allowedIds || allowedIds.length === 0) {
                return res.status(403).json({
                    message: 'Bạn không được phân công vào chi nhánh nào. Liên hệ quản lý.',
                });
            }

            // Ưu tiên primaryLocation, fallback chi nhánh đầu tiên được phép
            resolvedLocationId = employee.primaryLocation
                ? new mongoose.Types.ObjectId(employee.primaryLocation)
                : new mongoose.Types.ObjectId(allowedIds[0]);
        }

        if (!orderCode || typeof orderCode !== 'string' || orderCode.trim().length < 3) {
            return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ' });
        }
        if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'ID sản phẩm không hợp lệ' });
        }
        if (!reason) {
            return res.status(400).json({ message: 'Vui lòng chọn lý do bảo hành' });
        }
        const validReasons = ['product_damage', 'product_defect', 'battery_leak', 'charging_issue', 'other'];
        if (!validReasons.includes(reason)) {
            return res.status(400).json({ message: 'Lý do bảo hành không hợp lệ' });
        }

        const order = await Order.findOne({ code: orderCode.trim() })
            .populate('customerProfile', 'name phone email')
            .populate('items.product', 'sku name image warrantyYears warrantyMonths warrantyText')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn với mã này' });
        }

        const orderItem = (order.items || []).find(
            (item) => item.product?._id?.toString() === productId
        );
        if (!orderItem) {
            return res.status(404).json({ message: 'Sản phẩm không thuộc đơn hàng này' });
        }

        let warranty = await Warranty.findOne({
            orderCode: orderCode.trim(),
            productId: new mongoose.Types.ObjectId(productId),
            isDeleted: false,
        });

        // Chặn nếu đã có claim đang chờ xử lý
        if (warranty) {
            const hasPendingClaim = warranty.claims?.some((c) => c.status === 'pending') ?? false;
            if (hasPendingClaim) {
                return res.status(400).json({
                    message: 'Sản phẩm này đã có yêu cầu bảo hành đang chờ xử lý. Vui lòng chờ hoàn tất trước khi tạo yêu cầu mới.',
                });
            }
        }

        const purchaseDate = order.createdAt;
        const product = orderItem.product;

        if (!warranty) {
            const warrantyMonths =
                (product.warrantyYears || 0) * 12 + (product.warrantyMonths || 0);
            const warrantyEndDate = addMonths(purchaseDate, warrantyMonths || 12);
            const warrantyCode = await generateWarrantyCode();

            warranty = new Warranty({
                warrantyCode,
                orderId: order._id,
                orderCode: order.code,
                productId: new mongoose.Types.ObjectId(productId),
                productSnapshot: {
                    sku: product.sku || '',
                    name: product.name || '',
                    price: orderItem.price || 0,
                    image: product.image || '',
                    warrantyText: product.warrantyText || '',
                },
                customerId: order.customerProfile?._id || null,
                customerName: order.customerProfile?.name || customerName || '',
                customerPhone: order.customerProfile?.phone || customerPhone || '',
                purchaseDate,
                warrantyStartDate: purchaseDate,
                warrantyEndDate: warrantyEndDate,
                warrantyMonths: warrantyMonths || 12,
                status: 'claimed',
                locationId: resolvedLocationId,
            });
            await warranty.save();
        } else {
            warranty.status = 'claimed';
            warranty.locationId = resolvedLocationId;
            await warranty.save();
        }

        const claimCode = await generateClaimCode();
        const newClaim = {
            claimCode,
            reason,
            description: String(description || '').trim().slice(0, 1000),
            images: [],
            customerName: String(customerName || '').trim().slice(0, 100),
            customerPhone: String(customerPhone || '').trim().slice(0, 20),
            customerEmail: String(customerEmail || order.customerProfile?.email || '').trim().slice(0, 100),
            customerAddress: String(customerAddress || '').trim().slice(0, 300),
            notes: String(notes || '').trim().slice(0, 500),
            status: 'pending',
            createdAt: new Date(),
            resolvedAt: null,
            resolutionNotes: '',
            resolvedBy: null,
        };

        warranty.claims.push(newClaim);
        await warranty.save();

        const savedClaim = warranty.claims[warranty.claims.length - 1];

        // Gửi email xác nhận cho khách
        const claimEmail = savedClaim.customerEmail;
        if (claimEmail && typeof claimEmail === 'string' && claimEmail.includes('@')) {
            try {
                await sendWarrantyClaimConfirmationEmail({
                    toEmail: claimEmail,
                    customerName: savedClaim.customerName || order.customerProfile?.name || '',
                    warrantyCode: warranty.warrantyCode,
                    claimCode: savedClaim.claimCode,
                    productName: product?.name || '',
                    reason: savedClaim.reason,
                    createdAt: savedClaim.createdAt,
                });
            } catch (emailErr) {
                console.error('Gửi email xác nhận BH thất bại:', emailErr.message);
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Tạo phiếu bảo hành thành công!',
            data: {
                warrantyCode: warranty.warrantyCode,
                claimCode: savedClaim.claimCode,
                claim: savedClaim,
                createdBy: userId,
                locationId: resolvedLocationId,
            },
        });
    } catch (error) {
        console.error('createWarrantyClaim error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi tạo phiếu bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 10. Cập nhật thông tin bảo hành (Admin)
// PUT /api/warranties/:id
// Body: { warrantyEndDate, status }
// ────────────────────────────────────────────────────────────────────────
export const updateWarranty = async (req, res) => {
    try {
        const { id } = req.params;
        const { warrantyEndDate, status, notes } = req.body || {};

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bảo hành không hợp lệ' });
        }

        const warranty = await Warranty.findOne({ _id: id, isDeleted: false });
        if (!warranty) {
            return res.status(404).json({ message: 'Không tìm thấy bảo hành' });
        }

        if (status) {
            const validStatuses = ['active', 'claimed', 'expired'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
            }
            warranty.status = status;
        }

        if (warrantyEndDate) {
            const endDate = new Date(warrantyEndDate);
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ' });
            }
            warranty.warrantyEndDate = endDate;
        }

        if (notes !== undefined) {
            warranty.notes = String(notes).trim().slice(0, 500);
        }

        await warranty.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật bảo hành thành công',
            data: { warranty },
        });
    } catch (error) {
        console.error('updateWarranty error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// 11. Xóa mềm bảo hành (Admin)
// DELETE /api/warranties/:id
// ────────────────────────────────────────────────────────────────────────
export const deleteWarranty = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bảo hành không hợp lệ' });
        }

        const warranty = await Warranty.findOne({ _id: id, isDeleted: false });
        if (!warranty) {
            return res.status(404).json({ message: 'Không tìm thấy bảo hành' });
        }

        warranty.isDeleted = true;
        warranty.deletedAt = new Date();
        await warranty.save();

        return res.status(200).json({
            success: true,
            message: 'Xóa bảo hành thành công',
        });
    } catch (error) {
        console.error('deleteWarranty error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi xóa bảo hành',
            error: error.message,
        });
    }
};

// ────────────────────────────────────────────────────────────────────────
// INTERNAL – Tạo warranty records khi Order được tạo thành công.
// Gọi bên trong orderController sau khi order.save() thành công.
// ────────────────────────────────────────────────────────────────────────
export const createWarrantiesForOrder = async (order, orderItems, customerProfile) => {
    if (!order || !orderItems?.length || !customerProfile) return;
    if (order.isLegacyImport === true) return;

    const purchaseDate = order.createdAt || new Date();
    const warrantyRecords = [];

    for (const item of orderItems) {
        const product = await Product.findById(item.product).lean();
        if (!product) continue;

        const warrantyYears = product.warrantyYears || 0;
        const warrantyMonthsTotal = (warrantyYears || 0) * 12 + (product.warrantyMonths || 0);
        const warrantyText = product.warrantyText || '';

        // Không tạo warranty nếu sản phẩm không có thời gian bảo hành
        if (warrantyMonthsTotal <= 0) continue;

        const warrantyCode = await generateWarrantyCode();
        const warrantyEndDate = addMonths(purchaseDate, warrantyMonthsTotal);

        warrantyRecords.push({
            warrantyCode,
            orderId: order._id,
            orderCode: order.code,
            productId: item.product,
            productSnapshot: {
                sku: product.sku || '',
                name: product.name || '',
                price: item.price || 0,
                image: product.image || '',
                warrantyText,
            },
            customerId: customerProfile._id,
            customerName: customerProfile.name || '',
            customerPhone: customerProfile.phone || '',
            purchaseDate,
            warrantyStartDate: purchaseDate,
            warrantyEndDate,
            warrantyMonths: warrantyMonthsTotal,
            status: 'active',
        });
    }

    if (warrantyRecords.length > 0) {
        await Warranty.insertMany(warrantyRecords);
    }
};
