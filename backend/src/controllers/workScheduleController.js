import WorkSchedule from '../models/WorkSchedule.js';
import Employee from '../models/Employee.js';
import Shift from '../models/Shift.js';

// GET /api/work-schedules
export const getAllWorkSchedules = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            employeeId,
            locationId,
            dateFrom,
            dateTo,
        } = req.query;

        const query = {};

        if (employeeId) {
            query.employee = employeeId;
        }

        if (locationId) {
            query.location = locationId;
        }

        if (dateFrom || dateTo) {
            query.date = {};
            if (dateFrom) {
                // Parse date string thành UTC date (tránh timezone issues)
                const dateStr = dateFrom.split('T')[0]; // Lấy YYYY-MM-DD
                const [year, month, day] = dateStr.split('-').map(Number);
                const from = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
                query.date.$gte = from;
            }
            if (dateTo) {
                // Parse date string thành UTC date (tránh timezone issues)
                const dateStr = dateTo.split('T')[0]; // Lấy YYYY-MM-DD
                const [year, month, day] = dateStr.split('-').map(Number);
                const to = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
                query.date.$lte = to;
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [items, total] = await Promise.all([
            WorkSchedule.find(query)
                .populate({
                    path: 'employee',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName username email',
                    },
                })
                .populate('location', 'code name')
                .populate('shift', 'name startTime endTime checkInStartTime checkInEndTime')
                .sort({ date: 1, createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            WorkSchedule.countDocuments(query),
        ]);

        const totalPages = Math.ceil(total / Number(limit)) || 1;

        res.status(200).json({
            success: true,
            data: {
                schedules: items,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages,
                },
            },
        });
    } catch (error) {
        console.error('getAllWorkSchedules error:', error);
        res.status(500).json({ message: 'Lỗi khi lấy lịch làm việc', error: error.message });
    }
};

// POST /api/work-schedules
export const createWorkSchedule = async (req, res) => {
    try {
        const { employeeId, locationId, date, shiftId, note, repeatWeekly, repeatDays = [], applyToOtherEmployees } = req.body;

        if (!employeeId || !locationId || !date || !shiftId) {
            return res.status(400).json({
                message: 'Thiếu thông tin: nhân viên, chi nhánh, ngày làm việc hoặc ca làm việc',
            });
        }

        const employee = await Employee.findById(employeeId);
        if (!employee || employee.isDeleted) {
            return res.status(404).json({ message: 'Không tìm thấy nhân viên' });
        }

        const shift = await Shift.findById(shiftId);
        if (!shift || !shift.isActive) {
            return res.status(404).json({ message: 'Không tìm thấy ca làm việc hoặc ca đã bị vô hiệu hóa' });
        }

        // Parse date string thành Date object, đảm bảo timezone đúng
        // Lấy YYYY-MM-DD từ date string
        const dateStr = date.split('T')[0]; // Lấy YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        // Tạo date với UTC để đảm bảo ngày được lưu đúng trong MongoDB (UTC)
        // MongoDB lưu date theo UTC, nên cần tạo UTC date để tránh timezone issues
        const workDateFixed = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

        const employeesToAssign = repeatWeekly && applyToOtherEmployees
            ? await Employee.find({ isDeleted: false, isActive: true })
            : [employee];

        const schedules = [];

        // Tính toán tuần bắt đầu (Thứ 2 của tuần chứa workDate)
        // Lấy UTC date components để tính toán chính xác
        const getWeekStart = (utcDate) => {
            // Lấy UTC date components
            const year = utcDate.getUTCFullYear();
            const month = utcDate.getUTCMonth();
            const day = utcDate.getUTCDate();
            // Tạo date object từ UTC components
            const d = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const dayOfWeek = d.getUTCDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Nếu Chủ nhật thì lùi 6 ngày, nếu không thì lùi về Thứ 2
            const monday = new Date(d);
            monday.setUTCDate(d.getUTCDate() + diff);
            monday.setUTCHours(0, 0, 0, 0);
            return monday;
        };

        const weekStart = getWeekStart(workDateFixed);

        // Biến để đếm số lượng đã tạo và đã bỏ qua (dùng cho message)
        let totalCreatedCount = 0;
        let totalSkippedCount = 0;

        if (repeatWeekly && repeatDays.length > 0) {
            // Tạo lịch cho các ngày được chọn trong tuần hiện tại và 4 tuần tiếp theo
            for (let week = 0; week <= 4; week++) {
                for (const dayOfWeek of repeatDays) {
                    // Tính toán ngày trong tuần dựa trên dayOfWeek (0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7)
                    // weekStart là Thứ 2, nên:
                    // - Thứ 2 (1) = offset 0
                    // - Thứ 3 (2) = offset 1
                    // - ...
                    // - Chủ nhật (0) = offset 6
                    const dayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

                    // Tạo date với UTC để đảm bảo ngày được lưu đúng
                    const weekStartYear = weekStart.getUTCFullYear();
                    const weekStartMonth = weekStart.getUTCMonth();
                    const weekStartDay = weekStart.getUTCDate();
                    const scheduleDate = new Date(Date.UTC(weekStartYear, weekStartMonth, weekStartDay + week * 7 + dayOffset, 0, 0, 0, 0));

                    for (const emp of employeesToAssign) {
                        // Kiểm tra xem đã có lịch cho nhân viên, ngày và ca này chưa
                        const existing = await WorkSchedule.findOne({
                            employee: emp._id,
                            date: scheduleDate,
                            shift: shiftId,
                        });

                        if (!existing) {
                            // Nếu chưa có, tạo mới
                            const schedule = await WorkSchedule.create({
                                employee: emp._id,
                                location: locationId,
                                date: scheduleDate,
                                shift: shiftId,
                                note: note || '',
                            });
                            totalCreatedCount++;

                            // Lưu schedule đầu tiên được tạo cho employee chính (tuần đầu, ngày đầu tiên trong repeatDays)
                            if (week === 0 && dayOfWeek === repeatDays[0] && emp._id.toString() === employeeId && schedules.length === 0) {
                                schedules.push(schedule);
                            }
                        } else {
                            // Nếu đã có, bỏ qua và tiếp tục với ngày tiếp theo
                            totalSkippedCount++;
                        }
                    }
                }
            }

            // Nếu không có schedule nào được tạo (tất cả đều đã có), vẫn trả về success nhưng với message phù hợp
            if (schedules.length === 0 && totalCreatedCount === 0) {
                // Lấy một schedule đã tồn tại để populate và trả về
                const firstDayOfWeek = repeatDays[0];
                const dayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
                const weekStartYear = weekStart.getUTCFullYear();
                const weekStartMonth = weekStart.getUTCMonth();
                const weekStartDay = weekStart.getUTCDate();
                const firstScheduleDate = new Date(Date.UTC(weekStartYear, weekStartMonth, weekStartDay + dayOffset, 0, 0, 0, 0));

                const existingSchedule = await WorkSchedule.findOne({
                    employee: employeeId,
                    date: firstScheduleDate,
                    shift: shiftId,
                }).populate({
                    path: 'employee',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName username email',
                    },
                })
                    .populate('location', 'code name')
                    .populate('shift', 'name startTime endTime checkInStartTime checkInEndTime');

                if (existingSchedule) {
                    schedules.push(existingSchedule);
                }
            }
        } else {
            // Chỉ tạo cho ngày được chọn
            for (const emp of employeesToAssign) {
                // Kiểm tra xem đã có lịch cho nhân viên, ngày và ca này chưa
                const existing = await WorkSchedule.findOne({
                    employee: emp._id,
                    date: workDateFixed,
                    shift: shiftId,
                });

                if (existing) {
                    return res.status(400).json({
                        message: 'Ca làm việc này đã được gán cho nhân viên trong ngày này',
                    });
                }

                const schedule = await WorkSchedule.create({
                    employee: emp._id,
                    location: locationId,
                    date: workDateFixed,
                    shift: shiftId,
                    note: note || '',
                });
                schedules.push(schedule);
            }
        }

        if (schedules.length === 0) {
            return res.status(400).json({
                message: 'Không thể tạo lịch làm việc. Vui lòng kiểm tra lại thông tin.',
            });
        }

        const populated = await WorkSchedule.findById(schedules[0]._id)
            .populate({
                path: 'employee',
                populate: {
                    path: 'user',
                    select: 'firstName lastName username email',
                },
            })
            .populate('location', 'code name')
            .populate('shift', 'name startTime endTime checkInStartTime checkInEndTime');

        // Tạo message phù hợp dựa trên kết quả
        let message = 'Tạo lịch làm việc thành công';
        if (repeatWeekly && repeatDays.length > 0) {
            // Sử dụng số lượng đã đếm trong quá trình tạo
            if (totalCreatedCount > 0 && totalSkippedCount > 0) {
                message = `Tạo lịch làm việc thành công: ${totalCreatedCount} lịch đã được tạo, ${totalSkippedCount} lịch đã tồn tại và được bỏ qua`;
            } else if (totalCreatedCount > 0) {
                message = `Tạo lịch làm việc thành công: ${totalCreatedCount} lịch đã được tạo`;
            } else if (totalSkippedCount > 0) {
                message = `Tất cả các lịch đã tồn tại (${totalSkippedCount} lịch)`;
            }
        } else if (schedules.length > 1) {
            message = `Tạo lịch làm việc thành công cho ${schedules.length} nhân viên`;
        }

        res.status(201).json({
            success: true,
            message,
            data: { schedule: populated },
        });
    } catch (error) {
        console.error('createWorkSchedule error:', error);
        res.status(500).json({ message: 'Lỗi khi tạo lịch làm việc', error: error.message });
    }
};

// PUT /api/work-schedules/:id
export const updateWorkSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { locationId, date, shiftId, note, isActive } = req.body;

        const schedule = await WorkSchedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ message: 'Không tìm thấy lịch làm việc' });
        }

        if (locationId !== undefined) schedule.location = locationId;
        if (date !== undefined) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            schedule.date = d;
        }
        if (shiftId !== undefined) {
            const shift = await Shift.findById(shiftId);
            if (!shift || !shift.isActive) {
                return res.status(404).json({ message: 'Không tìm thấy ca làm việc hoặc ca đã bị vô hiệu hóa' });
            }
            schedule.shift = shiftId;
        }
        if (note !== undefined) schedule.note = note;
        if (isActive !== undefined) schedule.isActive = !!isActive;

        await schedule.save();

        const populated = await WorkSchedule.findById(schedule._id)
            .populate({
                path: 'employee',
                populate: {
                    path: 'user',
                    select: 'firstName lastName username email',
                },
            })
            .populate('location', 'code name')
            .populate('shift', 'name startTime endTime checkInStartTime checkInEndTime');

        res.status(200).json({
            success: true,
            message: 'Cập nhật lịch làm việc thành công',
            data: { schedule: populated },
        });
    } catch (error) {
        console.error('updateWorkSchedule error:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật lịch làm việc', error: error.message });
    }
};

// DELETE /api/work-schedules/:id
export const deleteWorkSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const schedule = await WorkSchedule.findById(id);
        if (!schedule) {
            return res.status(404).json({ message: 'Không tìm thấy lịch làm việc' });
        }

        await WorkSchedule.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Xóa lịch làm việc thành công' });
    } catch (error) {
        console.error('deleteWorkSchedule error:', error);
        res.status(500).json({ message: 'Lỗi khi xóa lịch làm việc', error: error.message });
    }
};

