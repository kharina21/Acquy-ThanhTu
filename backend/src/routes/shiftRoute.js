import express from 'express';
import {
    getAllShifts,
    getShiftById,
    createShift,
    updateShift,
    deleteShift,
} from '../controllers/shiftController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.get('/', authenticate, getAllShifts);
router.get('/:id', authenticate, getShiftById);
router.post('/', authenticate, hasRole('admin', 'manager'), createShift);
router.put('/:id', authenticate, hasRole('admin', 'manager'), updateShift);
router.delete('/:id', authenticate, hasRole('admin', 'manager'), deleteShift);

export default router;
