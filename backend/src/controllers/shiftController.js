import Shift from '../models/Shift.js';
import WorkSchedule from '../models/WorkSchedule.js';

// GET /api/shifts
export const getAllShifts = async (req, res) => {
    try {
        const { page = 1, limit = 100, isActive } = req.query;

        const query = {};
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [items, total] = await Promise.all([
            Shift.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Shift.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / Number(limit)) || 1;

        res.status(200).json({
            success: true,
            data: {
                shifts: items,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                },
            },
        });
    } catch (error) {
        console.error('getAllShifts error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách ca làm việc', error: error.message });
    }
};

// GET /api/shifts/:id
export const getShiftById = async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await Shift.findById(id);

        if (!shift) {
            return res.status(404).json({ message: 'Không tìm thấy ca làm việc' });
        }

        res.status(200).json({
            success: true,
            data: { shift },
        });
    } catch (error) {
        console.error('getShiftById error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin ca làm việc', error: error.message });
    }
};

// POST /api/shifts
export const createShift = async (req, res) => {
    try {
        const { name, startTime, endTime, checkInStartTime, checkInEndTime, note, isActive } = req.body;

        if (!name || !startTime || !endTime || !checkInStartTime || !checkInEndTime) {
            return res.status(400).json({
                message: 'Thiếu thông tin: tên ca, giờ làm việc hoặc giờ chấm công',
            });
        }

        const shift = await Shift.create({
            name,
            startTime,
            endTime,
            checkInStartTime,
            checkInEndTime,
            note: note || '',
            isActive: isActive !== undefined ? !!isActive : true,
        });

        const populated = await Shift.findById(shift._id);

        res.status(201).json({
            success: true,
            message: 'Tạo ca làm việc thành công',
            data: { shift: populated },
        });
    } catch (error) {
        console.error('createShift error:', error);
        res.status(500).json({ message: 'Lỗi khi tạo ca làm việc', error: error.message });
    }
};

// PUT /api/shifts/:id
export const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startTime, endTime, checkInStartTime, checkInEndTime, note, isActive } = req.body;

        const shift = await Shift.findById(id);
        if (!shift) {
            return res.status(404).json({ message: 'Không tìm thấy ca làm việc' });
        }

        if (name !== undefined) shift.name = name;
        if (startTime !== undefined) shift.startTime = startTime;
        if (endTime !== undefined) shift.endTime = endTime;
        if (checkInStartTime !== undefined) shift.checkInStartTime = checkInStartTime;
        if (checkInEndTime !== undefined) shift.checkInEndTime = checkInEndTime;
        if (note !== undefined) shift.note = note;
        if (isActive !== undefined) shift.isActive = !!isActive;

        await shift.save();

        const populated = await Shift.findById(shift._id);

        res.status(200).json({
            success: true,
            message: 'Cập nhật ca làm việc thành công',
            data: { shift: populated },
        });
    } catch (error) {
        console.error('updateShift error:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật ca làm việc', error: error.message });
    }
};

// DELETE /api/shifts/:id
export const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const shift = await Shift.findById(id);
        if (!shift) {
            return res.status(404).json({ message: 'Không tìm thấy ca làm việc' });
        }

        // Kiểm tra xem ca này có đang được sử dụng trong lịch làm việc không
        const schedulesUsingShift = await WorkSchedule.countDocuments({ shift: id });
        if (schedulesUsingShift > 0) {
            return res.status(400).json({
                message: `Không thể xóa ca này vì đang được sử dụng trong ${schedulesUsingShift} lịch làm việc`,
            });
        }

        await Shift.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Xóa ca làm việc thành công' });
    } catch (error) {
        console.error('deleteShift error:', error);
        res.status(500).json({ message: 'Lỗi khi xóa ca làm việc', error: error.message });
    }
};
