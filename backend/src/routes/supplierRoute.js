import express from 'express';
import {
    getNextCode,
    getAllSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} from '../controllers/supplierController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/next-code', getNextCode);
router.get('/', getAllSuppliers);
router.get('/:id', getSupplierById);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
