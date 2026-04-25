import mongoose from 'mongoose';
import Warranty from '../models/Warranty.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { addMonths } from '../utils/parseWarrantyText.js';

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

        // Tìm order trước để lấy thông tin
        const order = await Order.findOne({ code: orderCode.trim() })
            .populate('customerProfile', 'name phone type')
            .populate('items.product', 'sku name image warrantyYears warrantyMonths warrantyText')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn với mã này' });
        }

        // Lấy tất cả warranty của order
        const warranties = await Warranty.find({
            orderCode: orderCode.trim(),
            isDeleted: false,
        })
            .populate('productId', 'sku name image')
            .lean();

        // Map warranty theo productId để match nhanh với order items
        const warrantyMap = {};
        for (const w of warranties) {
            const pid = w.productId?._id?.toString();
            if (pid) warrantyMap[pid] = w;
        }

        // Luôn hiện order items — có warranty hay không đều hiện
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
                    canClaim: false,
                    hasPendingClaim: false,
                    claimsCount: 0,
                    latestClaim: null,
                    purchaseDate: order.createdAt,
                    warrantyStartDate: null,
                    warrantyEndDate: null,
                    status: 'no_warranty_record',
                    isExpired: false,
                };
            }

            const isExpired = new Date(w.warrantyEndDate) < now;
            const hasPendingClaim = w.claims?.some((c) => c.status === 'pending') ?? false;
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
                canClaim: !isExpired && !hasPendingClaim,
                hasPendingClaim,
                claimsCount: w.claims?.length || 0,
                latestClaim: w.claims?.length
                    ? w.claims.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
                    : null,
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
                    // Trả thêm items để frontend biết productId của từng sản phẩm
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
// 2. Gửi yêu cầu bảo hành từ mã hóa đơn (không cần warranty record có sẵn)
// POST /api/warranties/claim-from-order
// Body: { orderCode, productId, reason, description, images[], customerName, customerPhone, customerAddress, notes }
// ────────────────────────────────────────────────────────────────────────
export const submitClaimFromOrder = async (req, res) => {
    try {
        const {
            orderCode,
            productId,
            reason,
            description,
            images,
            customerName,
            customerPhone,
            customerAddress,
            notes,
        } = req.body || {};

        // Validate
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
        if (!Array.isArray(images) || images.length < 2) {
            return res.status(400).json({ message: 'Vui lòng upload ít nhất 2 ảnh sản phẩm thực tế' });
        }
        if (!customerName?.trim()) {
            return res.status(400).json({ message: 'Vui lòng nhập họ tên' });
        }
        if (!customerPhone?.trim()) {
            return res.status(400).json({ message: 'Vui lòng nhập số điện thoại' });
        }

        // Tìm order
        const order = await Order.findOne({ code: orderCode.trim() })
            .populate('customerProfile', 'name phone')
            .populate('items.product', 'sku name image warrantyYears warrantyMonths warrantyText')
            .lean();

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy hóa đơn với mã này' });
        }

        // Kiểm tra order đã hoàn thành chưa
        if (order.status !== 'completed' && order.paymentStatus !== 'paid') {
            return res.status(400).json({ message: 'Đơn hàng chưa hoàn thành. Vui lòng liên hệ cửa hàng.' });
        }

        // Tìm item trong order
        const orderItem = (order.items || []).find(
            (item) => item.product?._id?.toString() === productId
        );
        if (!orderItem) {
            return res.status(404).json({ message: 'Sản phẩm không thuộc đơn hàng này' });
        }

        // Tìm warranty record đã có
        let warranty = await Warranty.findOne({
            orderCode: orderCode.trim(),
            productId: new mongoose.Types.ObjectId(productId),
            isDeleted: false,
        }).lean();

        const purchaseDate = order.createdAt;
        const product = orderItem.product;

        if (!warranty) {
            // Tạo warranty record mới nếu chưa có
            const warrantyMonths =
                (product.warrantyYears || 0) * 12 + (product.warrantyMonths || 0);
            const warrantyEndDate = addMonths(purchaseDate, warrantyMonths || 12);
            const warrantyCode = await generateWarrantyCode();

            const newWarranty = new Warranty({
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
                customerName: order.customerProfile?.name || customerName,
                customerPhone: order.customerProfile?.phone || customerPhone,
                purchaseDate,
                warrantyStartDate: purchaseDate,
                warrantyEndDate: warrantyEndDate,
                warrantyMonths: warrantyMonths || 12,
                status: 'claimed',
            });
            await newWarranty.save();
            warranty = newWarranty;
        } else {
            // Kiểm tra đã có claim pending chưa
            const hasPending = warranty.claims?.some((c) => c.status === 'pending');
            if (hasPending) {
                return res.status(400).json({ message: 'Đã có yêu cầu bảo hành đang chờ xử lý cho sản phẩm này' });
            }
            warranty.status = 'claimed';
        }

        // Tạo claim
        const claimCode = await generateClaimCode();
        const newClaim = {
            claimCode,
            reason,
            description: String(description || '').trim().slice(0, 1000),
            images: images.slice(0, 10), // tối đa 10 ảnh
            customerName: String(customerName).trim().slice(0, 100),
            customerPhone: String(customerPhone).trim().slice(0, 20),
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

        return res.status(201).json({
            success: true,
            message: 'Yêu cầu bảo hành đã được gửi thành công! Cửa hàng sẽ liên hệ trong thời gian sớm nhất.',
            data: {
                warrantyCode: warranty.warrantyCode,
                claimCode: savedClaim.claimCode,
                claim: savedClaim,
            },
        });
    } catch (error) {
        console.error('submitClaimFromOrder error:', error.message);
        return res.status(500).json({
            message: 'Lỗi khi gửi yêu cầu bảo hành',
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
// Query: page, limit, status, orderCode, productId, customerId, dateFrom, dateTo
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
        } = req.query;

        const filter = { isDeleted: false };

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
// Query: page, limit, claimStatus, reason, orderCode, dateFrom, dateTo, search
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
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

        // Build match filter
        const matchFilter = { isDeleted: false };
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
        const { status, resolutionNotes } = req.body || {};

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID bảo hành không hợp lệ' });
        }

        if (!status) {
            return res.status(400).json({ message: 'Vui lòng chọn trạng thái' });
        }

        const validStatuses = ['pending', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
        }

        const warranty = await Warranty.findOne({ _id: id, isDeleted: false });
        if (!warranty) {
            return res.status(404).json({ message: 'Không tìm thấy bảo hành' });
        }

        const claim = warranty.claims.find((c) => c.claimCode === claimCode);
        if (!claim) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu bảo hành' });
        }

        // Cập nhật claim
        claim.status = status;
        if (resolutionNotes !== undefined) {
            claim.resolutionNotes = String(resolutionNotes).trim().slice(0, 1000);
        }

        if (['approved', 'rejected', 'completed'].includes(status)) {
            claim.resolvedAt = new Date();
            claim.resolvedBy = userId;
        }

        // Nếu tất cả claims đều đã xử lý xong → cập nhật lại status warranty
        const allResolved = warranty.claims.every((c) => c.status !== 'pending');
        if (allResolved) {
            warranty.status = 'active';
        }

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
