import Supplier from '../models/Supplier.js';
import StockIn from '../models/StockIn.js';
import { logAuthActivity, getClientIp, getUserAgent } from '../libs/activityLogger.js';

/**
 * Sinh mã nhà cung cấp tiếp theo: NCC-XXX (XXX = số thứ tự 3 chữ số).
 */
async function generateSupplierCode() {
    const last = await Supplier.findOne({}).sort({ code: -1 }).select('code').lean();
    let seq = 1;
    if (last?.code) {
        const match = last.code.match(/NCC-(\d+)/i);
        if (match) seq = parseInt(match[1], 10) + 1;
    }
    return `NCC-${String(seq).padStart(3, '0')}`;
}

export const getNextCode = async (req, res) => {
    try {
        const code = await generateSupplierCode();
        res.status(200).json({ success: true, data: { code } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo mã nhà cung cấp', error: error.message });
    }
};

export const getAllSuppliers = async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const filter = {};
        if (search) {
            filter.$or = [
                { code: { $regex: search, $options: 'i' } },
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }
        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }
        const suppliers = await Supplier.find(filter).sort({ code: 1 }).lean();

        // Tính tổng tiền đã mua (từ phiếu nhập đã xác nhận)
        const supplierIds = suppliers.map((s) => s._id);
        const totalPurchasedMap = await StockIn.aggregate([
            { $match: { supplier: { $in: supplierIds }, status: 'confirmed' } },
            { $group: { _id: '$supplier', total: { $sum: '$totalAmount' } } },
        ]);
        const totalMap = Object.fromEntries(totalPurchasedMap.map((t) => [t._id?.toString(), t.total || 0]));

        const suppliersWithStats = suppliers.map((s) => ({
            ...s,
            totalPurchased: totalMap[s._id.toString()] || 0,
            outstandingDebt: s.outstandingDebt ?? 0,
        }));

        res.status(200).json({ success: true, data: { suppliers: suppliersWithStats } });
    } catch (error) {
        console.error('getAllSuppliers error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách nhà cung cấp', error: error.message });
    }
};

export const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier.findById(id);
        if (!supplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }
        res.status(200).json({ success: true, data: { supplier } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin nhà cung cấp', error: error.message });
    }
};

export const createSupplier = async (req, res) => {
    try {
        const { code, name, phone, email, address, contactPerson, note, isActive, outstandingDebt } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: 'Tên nhà cung cấp là bắt buộc' });
        }

        const finalCode = code?.trim() || (await generateSupplierCode());

        const existing = await Supplier.findOne({ $or: [{ code: finalCode }, { name: name.trim() }] });
        if (existing) {
            return res.status(400).json({
                message: existing.code === finalCode ? 'Mã nhà cung cấp đã tồn tại' : 'Tên nhà cung cấp đã tồn tại',
            });
        }

        const supplier = new Supplier({
            code: finalCode,
            name: name.trim(),
            phone: phone?.trim() || '',
            email: email?.trim() || '',
            address: address?.trim() || '',
            contactPerson: contactPerson?.trim() || '',
            note: note?.trim() || '',
            isActive: isActive !== false,
            outstandingDebt: Math.max(0, parseFloat(outstandingDebt) || 0),
        });

        await supplier.save();

        await logAuthActivity({
            userId: req.user._id,
            action: 'create',
            resource: 'supplier',
            resourceId: supplier._id,
            description: `Tạo nhà cung cấp: ${supplier.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(201).json({
            success: true,
            message: 'Tạo nhà cung cấp thành công',
            data: { supplier },
        });
    } catch (error) {
        console.error('createSupplier error:', error.message);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Mã hoặc tên nhà cung cấp đã tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi khi tạo nhà cung cấp', error: error.message });
    }
};

export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, phone, email, address, contactPerson, note, isActive, outstandingDebt } = req.body;

        const supplier = await Supplier.findById(id);
        if (!supplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }

        if (name !== undefined && !name.trim()) {
            return res.status(400).json({ message: 'Tên nhà cung cấp không được để trống' });
        }

        if (code?.trim()) {
            const existing = await Supplier.findOne({ code: code.trim(), _id: { $ne: id } });
            if (existing) return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại' });
            supplier.code = code.trim();
        }
        if (name !== undefined) supplier.name = name.trim();
        if (phone !== undefined) supplier.phone = phone?.trim() || '';
        if (email !== undefined) supplier.email = email?.trim() || '';
        if (address !== undefined) supplier.address = address?.trim() || '';
        if (contactPerson !== undefined) supplier.contactPerson = contactPerson?.trim() || '';
        if (note !== undefined) supplier.note = note?.trim() || '';
        if (isActive !== undefined) supplier.isActive = isActive;
        if (outstandingDebt !== undefined) supplier.outstandingDebt = Math.max(0, parseFloat(outstandingDebt) || 0);

        await supplier.save();

        await logAuthActivity({
            userId: req.user._id,
            action: 'update',
            resource: 'supplier',
            resourceId: supplier._id,
            description: `Cập nhật nhà cung cấp: ${supplier.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({
            success: true,
            message: 'Cập nhật nhà cung cấp thành công',
            data: { supplier },
        });
    } catch (error) {
        console.error('updateSupplier error:', error.message);
        if (error.code === 11000) return res.status(400).json({ message: 'Mã nhà cung cấp đã tồn tại' });
        res.status(500).json({ message: 'Lỗi khi cập nhật nhà cung cấp', error: error.message });
    }
};

export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await Supplier.findById(id);
        if (!supplier) {
            return res.status(404).json({ message: 'Không tìm thấy nhà cung cấp' });
        }

        await Supplier.findByIdAndDelete(id);

        await logAuthActivity({
            userId: req.user._id,
            action: 'delete',
            resource: 'supplier',
            resourceId: id,
            description: `Xóa nhà cung cấp: ${supplier.name}`,
            ipAddress: getClientIp(req),
            userAgent: getUserAgent(req),
            status: 'success',
        });

        res.status(200).json({ success: true, message: 'Xóa nhà cung cấp thành công' });
    } catch (error) {
        console.error('deleteSupplier error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa nhà cung cấp', error: error.message });
    }
};
