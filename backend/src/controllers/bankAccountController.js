import mongoose from 'mongoose';
import BankAccount from '../models/BankAccount.js';
import Location from '../models/Location.js';

/** Lấy tài khoản từ các cơ sở khác (để chọn lại cho cơ sở hiện tại) */
export const getBankAccountsFromOtherLocations = async (req, res) => {
    try {
        const { excludeLocationId } = req.query || {};
        if (!excludeLocationId || !mongoose.Types.ObjectId.isValid(excludeLocationId)) {
            return res.status(200).json({ success: true, data: { accounts: [] } });
        }
        const accounts = await BankAccount.find({ location: { $ne: excludeLocationId } })
            .populate('location', 'name')
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            success: true,
            data: { accounts },
        });
    } catch (error) {
        console.error('getBankAccountsFromOtherLocations error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi lấy tài khoản' });
    }
};

export const getBankAccountsByLocation = async (req, res) => {
    try {
        const { locationId } = req.params;
        if (!locationId || !mongoose.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({ message: 'locationId không hợp lệ' });
        }
        const accounts = await BankAccount.find({ location: locationId }).sort({ isDefault: -1, createdAt: 1 }).lean();
        return res.status(200).json({
            success: true,
            data: { accounts },
        });
    } catch (error) {
        console.error('getBankAccountsByLocation error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi lấy tài khoản ngân hàng' });
    }
};

export const createBankAccount = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { locationId, bankCode, bankName, bankAccount, userBankName, isDefault, note } = req.body || {};
        if (!locationId || !bankCode?.trim() || !bankAccount?.trim() || !userBankName?.trim()) {
            return res.status(400).json({
                message: 'Vui lòng nhập đầy đủ: Chi nhánh, Mã ngân hàng, Số tài khoản, Tên chủ tài khoản',
            });
        }

        const location = await Location.findById(locationId);
        if (!location) return res.status(404).json({ message: 'Không tìm thấy chi nhánh' });

        if (isDefault) {
            await BankAccount.updateMany({ location: locationId }, { isDefault: false });
        }

        const account = await BankAccount.create({
            location: locationId,
            bankCode: bankCode.trim().toUpperCase(),
            bankName: (bankName || '').trim(),
            bankAccount: bankAccount.trim(),
            userBankName: userBankName.trim(),
            isDefault: !!isDefault,
            note: (note || '').trim(),
        });

        return res.status(201).json({
            success: true,
            message: 'Thêm tài khoản ngân hàng thành công',
            data: { account },
        });
    } catch (error) {
        console.error('createBankAccount error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi thêm tài khoản' });
    }
};

export const updateBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const { bankCode, bankName, bankAccount, userBankName, isDefault, note } = req.body || {};
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }

        const account = await BankAccount.findById(id);
        if (!account) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });

        if (bankCode?.trim()) account.bankCode = bankCode.trim().toUpperCase();
        if (bankName !== undefined) account.bankName = bankName.trim();
        if (bankAccount?.trim()) account.bankAccount = bankAccount.trim();
        if (userBankName?.trim()) account.userBankName = userBankName.trim();
        if (note !== undefined) account.note = note.trim();
        if (typeof isDefault === 'boolean') {
            if (isDefault) {
                await BankAccount.updateMany({ location: account.location }, { isDefault: false });
            }
            account.isDefault = isDefault;
        }

        await account.save();

        return res.status(200).json({
            success: true,
            message: 'Cập nhật tài khoản thành công',
            data: { account },
        });
    } catch (error) {
        console.error('updateBankAccount error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi cập nhật' });
    }
};

export const deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID không hợp lệ' });
        }
        const account = await BankAccount.findByIdAndDelete(id);
        if (!account) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
        return res.status(200).json({ success: true, message: 'Đã xóa tài khoản' });
    } catch (error) {
        console.error('deleteBankAccount error:', error.message);
        return res.status(500).json({ message: 'Lỗi khi xóa' });
    }
};
