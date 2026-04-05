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
    uploadProductImage,
    getCarBatteryProducts,
    getMotorcycleBatteryProducts,
    getFilterOptions,
    filterProducts,
    getRelatedProducts
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

// Upload ảnh sản phẩm (lên Cloudinary)
const uploadImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận ảnh (JPEG, PNG, WebP, GIF)'), false);
        }
    },
});


// Routes không cần đăng nhập, cho public 
router.get('/', getAllProducts);
router.get('/options', getProductOptions);
router.get('/car-batteries', getCarBatteryProducts);
router.get('/motorcycle-batteries', getMotorcycleBatteryProducts);
router.post('/upload-image', uploadImage.array('image', 20), uploadProductImage);
router.get("/filter", filterProducts);
router.get('/filter-options', getFilterOptions);
router.get('/:id/related', getRelatedProducts);

router.get('/:id', getProductById);


// Tất cả routes đều cần đăng nhập và role admin hoặc manager
router.use(authenticate);
router.use(hasRole('admin', 'manager', 'warehouse_manager', 'Quản lý chi nhánh'));

router.get('/', getAllProducts);
router.get('/options', getProductOptions);
router.post('/bulk-update-price', bulkUpdatePrice);
router.post('/upload-image', uploadImage.array('image', 20), uploadProductImage);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

// Import sản phẩm từ Excel (field name: file)
router.post('/import', upload.single('file'), importFromExcel);

export default router;
