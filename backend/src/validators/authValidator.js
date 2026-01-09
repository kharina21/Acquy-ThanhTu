import { body, validationResult } from 'express-validator';

// Validation rules cho đăng ký
export const registerValidation = [
    // Username validation
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username không được để trống')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username phải từ 3 đến 30 ký tự')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username chỉ được chứa chữ cái, số và dấu gạch dưới'),

    // Password validation
    body('password')
        .notEmpty()
        .withMessage('Mật khẩu không được để trống')
        .isLength({ min: 6, max: 100 })
        .withMessage('Mật khẩu phải từ 6 đến 100 ký tự'),

    // Email validation
    body('email').trim().notEmpty().withMessage('Email không được để trống').isEmail().withMessage('Email không hợp lệ').normalizeEmail(),

    // First name validation
    body('firstName').trim().notEmpty().withMessage('Họ không được để trống').isLength({ min: 1, max: 50 }).withMessage('Họ phải từ 1 đến 50 ký tự'),

    // Last name validation
    body('lastName').trim().notEmpty().withMessage('Tên không được để trống').isLength({ min: 1, max: 50 }).withMessage('Tên phải từ 1 đến 50 ký tự'),

    // Phone number validation (optional)
    body('phoneNumber')
        .optional({ checkFalsy: true }) // Bỏ qua nếu null, undefined, hoặc chuỗi rỗng
        .trim()
        .matches(/^(0|\+84)[1-9][0-9]{8,9}$/)
        .withMessage('Số điện thoại phải đúng định dạng Việt Nam (ví dụ: 0912345678 hoặc +84912345678)'),

    // Address validation (optional)
    body('address')
        .optional({ checkFalsy: true }) // Bỏ qua nếu null, undefined, hoặc chuỗi rỗng
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Địa chỉ phải từ 5 đến 200 ký tự'),
];

// Middleware để xử lý validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Lấy message đầu tiên hoặc tất cả messages
        const errorMessages = errors.array().map((err) => err.msg);
        return res.status(400).json({
            message: errorMessages[0] || 'Dữ liệu không hợp lệ',
            errors: errorMessages,
        });
    }
    next();
};
