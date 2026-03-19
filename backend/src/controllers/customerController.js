import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import User from '../models/User.js';

const TYPE_LABELS = {
    walkin: 'Khách vãng lai',
    retail: 'Khách lẻ',
    registered: 'Liên kết tài khoản',
};

export const getAllCustomers = async (req, res) => {
    try {
        const { search, type, page = 1, limit = 20 } = req.query;
        const filter = { isDeleted: { $ne: true } };
        if (search?.trim()) {
            filter.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { phone: { $regex: search.trim(), $options: 'i' } },
            ];
        }
        if (type && ['walkin', 'retail', 'registered'].includes(type)) {
            filter.type = type;
        }

        const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
        const skip = (Math.max(1, parseInt(page)) - 1) * limitNum;

        const [customers, total] = await Promise.all([
            Customer.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .populate('userId', 'username email firstName lastName phoneNumber')
                .lean(),
            Customer.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                customers,
                pagination: {
                    page: Math.max(1, parseInt(page)),
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('getAllCustomers error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách khách hàng', error: error.message });
    }
};

export const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findById(id).populate('userId', 'username email firstName lastName phoneNumber').lean();
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ success: true, data: { customer } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin khách hàng', error: error.message });
    }
};

export const createCustomer = async (req, res) => {
    try {
        const { name, phone, type } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: 'Tên khách hàng là bắt buộc' });
        }

        const customerType = ['walkin', 'retail', 'registered'].includes(type) ? type : 'retail';

        if (customerType === 'walkin') {
            const customer = await Customer.create({
                name: name.trim() || 'Khách vãng lai',
                phone: '',
                type: 'walkin',
            });
            return res.status(201).json({ success: true, data: { customer } });
        }

        if (!phone?.trim()) {
            return res.status(400).json({ message: 'Số điện thoại là bắt buộc đối với khách lẻ' });
        }

        const existing = await Customer.findOne({ phone: phone.trim(), type: { $ne: 'walkin' }, isDeleted: { $ne: true } });
        if (existing) {
            return res.status(400).json({ message: 'Số điện thoại đã tồn tại trong danh sách khách hàng' });
        }

        const softDeleted = await Customer.findOne({ phone: phone.trim(), type: { $ne: 'walkin' }, isDeleted: true });
        if (softDeleted) {
            return res.status(409).json({
                success: false,
                code: 'CUSTOMER_SOFT_DELETED',
                message: 'Khách hàng này đã bị xóa. Bạn có muốn thêm lại?',
                customerId: softDeleted._id.toString(),
            });
        }

        const userWithPhone = await User.findOne({
            phoneNumber: phone.trim(),
            isDeleted: { $ne: true },
        }).lean();

        const resolvedType = userWithPhone ? 'registered' : customerType;
        const customerData = {
            name: name.trim(),
            phone: phone.trim(),
            type: resolvedType,
        };
        if (userWithPhone) {
            customerData.userId = userWithPhone._id;
        }

        const customer = await Customer.create(customerData);

        if (userWithPhone) {
            await User.findByIdAndUpdate(userWithPhone._id, { customerId: customer._id });
        }

        res.status(201).json({ success: true, data: { customer } });
    } catch (error) {
        console.error('createCustomer error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo khách hàng', error: error.message });
    }
};

export const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, type, accumulatedAmount } = req.body;

        const customer = await Customer.findOne({ _id: id, isDeleted: { $ne: true } });
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }

        if (name !== undefined) {
            if (!name?.trim()) {
                return res.status(400).json({ message: 'Tên khách hàng là bắt buộc' });
            }
            customer.name = name.trim();
        }

        const customerType = ['walkin', 'retail', 'registered'].includes(type) ? type : customer.type;
        customer.type = customerType;

        if (customerType === 'walkin') {
            customer.phone = '';
        } else if (phone !== undefined) {
            if (!phone?.trim()) {
                return res.status(400).json({ message: 'Số điện thoại là bắt buộc đối với khách lẻ và khách có tài khoản' });
            }
            const existing = await Customer.findOne({ phone: phone.trim(), _id: { $ne: id }, isDeleted: { $ne: true } });
            if (existing) {
                return res.status(400).json({ message: 'Số điện thoại đã được sử dụng bởi khách hàng khác' });
            }
            customer.phone = phone.trim();
        }

        if (accumulatedAmount !== undefined) {
            customer.accumulatedAmount = Math.max(0, parseFloat(accumulatedAmount) || 0);
        }

        await customer.save();

        res.status(200).json({ success: true, data: { customer } });
    } catch (error) {
        console.error('updateCustomer error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật khách hàng', error: error.message });
    }
};

export const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findOneAndUpdate(
            { _id: id, isDeleted: { $ne: true } },
            { isDeleted: true },
            { new: true }
        );
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ success: true, message: 'Đã xóa khách hàng' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xóa khách hàng', error: error.message });
    }
};

/** Khôi phục khách hàng đã bị xóa soft */
export const restoreCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await Customer.findByIdAndUpdate(id, { isDeleted: false }, { new: true })
            .populate('userId', 'username email firstName lastName phoneNumber')
            .lean();
        if (!customer) {
            return res.status(404).json({ message: 'Không tìm thấy khách hàng' });
        }
        res.status(200).json({ success: true, data: { customer }, message: 'Đã khôi phục khách hàng' });
    } catch (error) {
        console.error('restoreCustomer error:', error.message);
        res.status(500).json({ message: 'Lỗi khi khôi phục khách hàng', error: error.message });
    }
};

/** Tìm khách hàng theo SĐT hoặc tên (dùng cho POS, autocomplete) */
export const searchCustomersByPhone = async (req, res) => {
    try {
        const { phone, q } = req.query;
        const term = (q || phone || '').trim();
        if (!term) {
            return res.status(200).json({ success: true, data: { customers: [] } });
        }
        const customers = await Customer.find({
            $or: [
                { phone: { $regex: term, $options: 'i' } },
                { name: { $regex: term, $options: 'i' } },
            ],
            type: { $in: ['retail', 'registered'] },
            isDeleted: { $ne: true },
        })
            .limit(10)
            .lean();
        res.status(200).json({ success: true, data: { customers } });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tìm kiếm', error: error.message });
    }
};
