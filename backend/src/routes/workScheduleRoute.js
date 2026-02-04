import express from 'express';
import {
    getAllWorkSchedules,
    createWorkSchedule,
    updateWorkSchedule,
    deleteWorkSchedule,
} from '../controllers/workScheduleController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
// Chỉ admin và manager quản lý lịch làm việc
router.use(hasRole('admin', 'manager'));

router.get('/', getAllWorkSchedules);
router.post('/', createWorkSchedule);
router.put('/:id', updateWorkSchedule);
router.delete('/:id', deleteWorkSchedule);

export default router;

