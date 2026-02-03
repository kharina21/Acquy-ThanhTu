import express from 'express';
import {
    getAllBrands,
    getBrandById,
    createBrand,
    updateBrand,
    deleteBrand,
} from '../controllers/brandController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Tất cả routes đều cần authenticate và có role admin hoặc manager
router.use(authenticate);
router.use(hasRole('admin', 'manager'));

router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

export default router;


