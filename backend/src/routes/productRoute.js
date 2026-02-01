import express from 'express';
import multer from 'multer';
import {
    getAllProducts,
    getProductOptions,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    importFromExcel,
    bulkUpdatePrice,
    bulkUpdateWarranty,
    countProductsByFilter,
} from '../controllers/productController.js';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Upload file Excel vào memory (để parse buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
        }
    },
});

// Tất cả routes đều cần đăng nhập và role admin hoặc owner
router.use(authenticate);
router.use(hasRole('admin', 'owner'));

router.get('/', getAllProducts);
router.get('/options', getProductOptions);
router.get('/count', countProductsByFilter);
router.post('/bulk-update-price', bulkUpdatePrice);
router.post('/bulk-update-warranty', bulkUpdateWarranty);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Import sản phẩm từ Excel (field name: file)
router.post('/import', upload.single('file'), importFromExcel);

export default router;
