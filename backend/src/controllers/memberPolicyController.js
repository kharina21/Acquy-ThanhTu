import MemberPolicy from '../models/MemberPolicy.js';

// GET /api/member-policies
export const getAllMemberPolicies = async (req, res) => {
    try {
        const { isActive } = req.query;
        const filter = {};
        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }
        const policies = await MemberPolicy.find(filter).sort({ sortOrder: 1, minTotalSpent: 1, createdAt: 1 });
        res.status(200).json({
            success: true,
            data: { policies },
        });
    } catch (error) {
        console.error('getAllMemberPolicies error:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách hạng thành viên', error: error.message });
    }
};

// POST /api/member-policies
export const createMemberPolicy = async (req, res) => {
    try {
        const { name, code, description, minTotalSpent, discountPercent, isActive, sortOrder } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Tên hạng là bắt buộc' });
        }
        if (!code || !code.trim()) {
            return res.status(400).json({ message: 'Mã hạng là bắt buộc' });
        }

        const normalizedCode = code.trim().toUpperCase();
        const existing = await MemberPolicy.findOne({ code: normalizedCode });
        if (existing) {
            return res.status(400).json({ message: 'Mã hạng đã tồn tại' });
        }

        const minSpent = Number(minTotalSpent) || 0;
        const discount = Number(discountPercent) || 0;
        if (minSpent < 0) {
            return res.status(400).json({ message: 'Tổng chi tiêu tối thiểu không hợp lệ' });
        }
        if (discount < 0 || discount > 100) {
            return res.status(400).json({ message: 'Phần trăm giảm giá phải từ 0 đến 100' });
        }

        const policy = await MemberPolicy.create({
            name: name.trim(),
            code: normalizedCode,
            description: description?.trim() || '',
            minTotalSpent: minSpent,
            discountPercent: discount,
            isActive: isActive !== false,
            sortOrder: sortOrder != null ? Number(sortOrder) : 0,
        });

        res.status(201).json({
            success: true,
            message: 'Tạo hạng thành viên thành công',
            data: { policy },
        });
    } catch (error) {
        console.error('createMemberPolicy error:', error.message);
        res.status(500).json({ message: 'Lỗi khi tạo hạng thành viên', error: error.message });
    }
};

// PUT /api/member-policies/:id
export const updateMemberPolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, description, minTotalSpent, discountPercent, isActive, sortOrder } = req.body;

        const policy = await MemberPolicy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: 'Không tìm thấy hạng thành viên' });
        }

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ message: 'Tên hạng không được để trống' });
            }
            policy.name = name.trim();
        }

        if (code !== undefined) {
            if (!code.trim()) {
                return res.status(400).json({ message: 'Mã hạng không được để trống' });
            }
            const normalizedCode = code.trim().toUpperCase();
            const existing = await MemberPolicy.findOne({ code: normalizedCode, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ message: 'Mã hạng đã tồn tại' });
            }
            policy.code = normalizedCode;
        }

        if (description !== undefined) {
            policy.description = description?.trim() || '';
        }

        if (minTotalSpent !== undefined) {
            const minSpent = Number(minTotalSpent);
            if (Number.isNaN(minSpent) || minSpent < 0) {
                return res.status(400).json({ message: 'Tổng chi tiêu tối thiểu không hợp lệ' });
            }
            policy.minTotalSpent = minSpent;
        }

        if (discountPercent !== undefined) {
            const discount = Number(discountPercent);
            if (Number.isNaN(discount) || discount < 0 || discount > 100) {
                return res.status(400).json({ message: 'Phần trăm giảm giá phải từ 0 đến 100' });
            }
            policy.discountPercent = discount;
        }

        if (isActive !== undefined) {
            policy.isActive = !!isActive;
        }

        if (sortOrder !== undefined) {
            policy.sortOrder = Number(sortOrder) || 0;
        }

        await policy.save();

        res.status(200).json({
            success: true,
            message: 'Cập nhật hạng thành viên thành công',
            data: { policy },
        });
    } catch (error) {
        console.error('updateMemberPolicy error:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật hạng thành viên', error: error.message });
    }
};

// DELETE /api/member-policies/:id
export const deleteMemberPolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const policy = await MemberPolicy.findById(id);
        if (!policy) {
            return res.status(404).json({ message: 'Không tìm thấy hạng thành viên' });
        }

        await MemberPolicy.findByIdAndDelete(id);
        res.status(200).json({
            success: true,
            message: 'Xóa hạng thành viên thành công',
        });
    } catch (error) {
        console.error('deleteMemberPolicy error:', error.message);
        res.status(500).json({ message: 'Lỗi khi xóa hạng thành viên', error: error.message });
    }
};

