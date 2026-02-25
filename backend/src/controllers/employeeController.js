import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

/** Chuẩn hóa mã NV: NV + 5 chữ số (NV00001). */
const EMPCODE_REGEX = /^NV\d{5}$/i;

/** Sinh mã nhân viên tiếp theo (NV00001, NV00002, ...). */
const getNextEmpCode = async () => {
    const docs = await Employee.find({ empCode: { $regex: /^NV\d+$/i }, isDeleted: false })
        .select('empCode')
        .lean();
    let maxNum = 0;
    for (const d of docs) {
        if (d.empCode) {
            const num = parseInt(d.empCode.replace(/^NV/i, ''), 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
    }
    const next = maxNum + 1;
    return 'NV' + String(next).padStart(5, '0');
};

/** Kiểm tra mã NV hợp lệ (NV + 5 số). */
const isValidEmpCode = (code) => code && typeof code === 'string' && EMPCODE_REGEX.test(code.trim().toUpperCase());

// Helper: kiểm tra user có phải nhân viên (không phải customer thuần, không phải admin)
const isStaffUser = async (userId) => {
    const user = await User.findById(userId).populate('roles');
    if (!user) return false;
    const roleNames = user.roles.map((r) => r.name);
    if (roleNames.includes('admin')) return false;
    if (roleNames.includes('user') && roleNames.length === 1) return false;
    return true;
};

// GET /api/employees
export const getAllEmployees = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            locationId,
            status, // 'active' | 'inactive'
        } = req.query;

        const query = { isDeleted: false };

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        if (locationId) {
            query.$or = [
                { primaryLocation: locationId },
                { locations: locationId },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [items, total] = await Promise.all([
            Employee.find(query)
                .populate('user', 'username firstName lastName email phoneNumber status roles')
                .populate('primaryLocation', 'name code')
                .populate('locations', 'name code')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Employee.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / Number(limit)) || 1;

        res.status(200).json({
            success: true,
            data: {
                employees: items,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                },
            },
        });
    } catch (error) {
        console.error('getAllEmployees error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách nhân viên', error: error.message });
    }
};

// GET /api/employees/:id
export const getEmployeeById = async (req, res) => {
    try {
        const emp = await Employee.findOne({ _id: req.params.id, isDeleted: false })
            .populate('user', 'username firstName lastName email phoneNumber status roles')
            .populate('primaryLocation', 'name code')
            .populate('locations', 'name code');

        if (!emp) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        }

        res.status(200).json({ success: true, data: { employee: emp } });
    } catch (error) {
        console.error('getEmployeeById error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin nhân viên', error: error.message });
    }
};

// POST /api/employees
export const createEmployee = async (req, res) => {
    try {
        const {
            userId,
            empCode: rawEmpCode,
            primaryLocation,
            locations = [],
            salaryType = 'monthly',
            baseSalary = 0,
            hireDate,
            note = '',
        } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'Thiếu userId' });
        }

        let empCode = typeof rawEmpCode === 'string' ? rawEmpCode.trim().toUpperCase() : '';
        if (empCode && !isValidEmpCode(empCode)) {
            return res.status(400).json({ message: 'Mã nhân viên phải có dạng NV + 5 chữ số (ví dụ: NV00001)' });
        }
        if (empCode) {
            const existing = await Employee.findOne({ empCode, isDeleted: false });
            if (existing) {
                return res.status(400).json({ message: 'Mã nhân viên đã tồn tại' });
            }
        } else {
            empCode = await getNextEmpCode();
        }

        // Kiểm tra user tồn tại & là nhân viên
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }

        const isStaff = await isStaffUser(userId);
        if (!isStaff) {
            return res.status(400).json({ message: 'Chỉ tạo hồ sơ nhân viên cho tài khoản nhân viên' });
        }

        // Tìm bản ghi Employee theo user (kể cả đã soft delete) để tránh trùng và cho phép khôi phục
        const existingByUser = await Employee.findOne({ user: userId });
        if (existingByUser) {
            if (!existingByUser.isDeleted) {
                return res.status(400).json({ message: 'Nhân viên này đã có hồ sơ' });
            }
            // Đã từng có hồ sơ nhưng đã xóa mềm → cập nhật và khôi phục
            existingByUser.isDeleted = false;
            existingByUser.isActive = true;
            existingByUser.primaryLocation = primaryLocation || null;
            existingByUser.locations = Array.isArray(locations) ? locations : [];
            existingByUser.salaryType = salaryType;
            existingByUser.baseSalary = baseSalary;
            existingByUser.hireDate = hireDate ? new Date(hireDate) : null;
            existingByUser.note = note || '';
            if (empCode) {
                const conflict = await Employee.findOne({ empCode, isDeleted: false, _id: { $ne: existingByUser._id } });
                if (conflict) {
                    return res.status(400).json({ message: 'Mã nhân viên đã tồn tại' });
                }
                existingByUser.empCode = empCode;
            } else if (!existingByUser.empCode) {
                existingByUser.empCode = await getNextEmpCode();
            }
            await existingByUser.save();
            const populated = await Employee.findById(existingByUser._id)
                .populate('user', 'username firstName lastName email phoneNumber status roles')
                .populate('primaryLocation', 'name code')
                .populate('locations', 'name code');
            return res.status(200).json({
                success: true,
                message: 'Khôi phục và cập nhật hồ sơ nhân viên thành công',
                data: { employee: populated },
            });
        }

        const emp = await Employee.create({
            empCode,
            user: userId,
            primaryLocation: primaryLocation || null,
            locations,
            salaryType,
            baseSalary,
            hireDate: hireDate ? new Date(hireDate) : null,
            note,
        });

        const populated = await Employee.findById(emp._id)
            .populate('user', 'username firstName lastName email phoneNumber status roles')
            .populate('primaryLocation', 'name code')
            .populate('locations', 'name code');

        res.status(201).json({
            success: true,
            message: 'Tạo hồ sơ nhân viên thành công',
            data: { employee: populated },
        });
    } catch (error) {
        console.error('createEmployee error:', error);
        res.status(500).json({ message: 'Lỗi khi tạo nhân viên', error: error.message });
    }
};

// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            empCode: rawEmpCode,
            primaryLocation,
            locations,
            salaryType,
            baseSalary,
            hireDate,
            note,
            isActive,
        } = req.body;

        const emp = await Employee.findOne({ _id: id, isDeleted: false });
        if (!emp) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        }

        if (rawEmpCode !== undefined) {
            const empCode = typeof rawEmpCode === 'string' ? rawEmpCode.trim().toUpperCase() : '';
            if (empCode && !isValidEmpCode(empCode)) {
                return res.status(400).json({ message: 'Mã nhân viên phải có dạng NV + 5 chữ số (ví dụ: NV00001)' });
            }
            if (empCode) {
                const existing = await Employee.findOne({ empCode, isDeleted: false, _id: { $ne: id } });
                if (existing) {
                    return res.status(400).json({ message: 'Mã nhân viên đã tồn tại' });
                }
                emp.empCode = empCode;
            } else {
                emp.empCode = null;
            }
        }
        if (primaryLocation !== undefined) emp.primaryLocation = primaryLocation || null;
        if (Array.isArray(locations)) emp.locations = locations;
        if (salaryType !== undefined) emp.salaryType = salaryType;
        if (baseSalary !== undefined) emp.baseSalary = baseSalary;
        if (hireDate !== undefined) emp.hireDate = hireDate ? new Date(hireDate) : null;
        if (note !== undefined) emp.note = note;
        if (isActive !== undefined) emp.isActive = !!isActive;

        await emp.save();

        const populated = await Employee.findById(emp._id)
            .populate('user', 'username firstName lastName email phoneNumber status roles')
            .populate('primaryLocation', 'name code')
            .populate('locations', 'name code');

        res.status(200).json({
            success: true,
            message: 'Cập nhật hồ sơ nhân viên thành công',
            data: { employee: populated },
        });
    } catch (error) {
        console.error('updateEmployee error:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật nhân viên', error: error.message });
    }
};

// DELETE /api/employees/:id (soft delete)
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const emp = await Employee.findById(id);
        if (!emp || emp.isDeleted) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        }

        emp.isDeleted = true;
        emp.isActive = false;
        await emp.save();

        res.status(200).json({ success: true, message: 'Xóa hồ sơ nhân viên thành công' });
    } catch (error) {
        console.error('deleteEmployee error:', error);
        res.status(500).json({ message: 'Lỗi khi xóa nhân viên', error: error.message });
    }
};

