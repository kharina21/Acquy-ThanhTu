import { body, validationResult } from 'express-validator';

// Validation rules cho tạo user
export const createUserValidation = [
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
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email không được để trống')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),

    // First name validation
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('Họ không được để trống')
        .isLength({ min: 1, max: 50 })
        .withMessage('Họ phải từ 1 đến 50 ký tự'),

    // Last name validation
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Tên không được để trống')
        .isLength({ min: 1, max: 50 })
        .withMessage('Tên phải từ 1 đến 50 ký tự'),

    // Phone number validation (optional)
    body('phoneNumber')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^(0|\+84)[1-9][0-9]{8,9}$/)
        .withMessage('Số điện thoại phải đúng định dạng Việt Nam (ví dụ: 0912345678 hoặc +84912345678)'),

    // Address validation (optional)
    body('address')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Địa chỉ phải từ 5 đến 200 ký tự'),

    // Roles validation (optional)
    body('roles')
        .optional()
        .isArray()
        .withMessage('Roles phải là một mảng'),
    body('roles.*')
        .optional()
        .isString()
        .withMessage('Mỗi role phải là một chuỗi'),
];

// Validation rules cho cập nhật user
export const updateUserValidation = [
    // Email validation
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email không được để trống')
        .isEmail()
        .withMessage('Email không hợp lệ')
        .normalizeEmail(),

    // First name validation
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('Họ không được để trống')
        .isLength({ min: 1, max: 50 })
        .withMessage('Họ phải từ 1 đến 50 ký tự'),

    // Last name validation
    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Tên không được để trống')
        .isLength({ min: 1, max: 50 })
        .withMessage('Tên phải từ 1 đến 50 ký tự'),

    // Phone number validation (optional)
    body('phoneNumber')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^(0|\+84)[1-9][0-9]{8,9}$/)
        .withMessage('Số điện thoại phải đúng định dạng Việt Nam (ví dụ: 0912345678 hoặc +84912345678)'),

    // Address validation (optional)
    body('address')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Địa chỉ phải từ 5 đến 200 ký tự'),
];

// Validation rules cho assign roles
export const assignRolesValidation = [
    body('roles')
        .notEmpty()
        .withMessage('Roles không được để trống')
        .isArray()
        .withMessage('Roles phải là một mảng')
        .custom((value) => {
            if (value.length === 0) {
                throw new Error('Phải có ít nhất một role');
            }
            return true;
        }),
    body('roles.*')
        .isString()
        .withMessage('Mỗi role phải là một chuỗi')
        .trim()
        .notEmpty()
        .withMessage('Role không được để trống'),
];

// Validation rules cho remove roles
export const removeRolesValidation = [
    body('roles')
        .notEmpty()
        .withMessage('Roles không được để trống')
        .isArray()
        .withMessage('Roles phải là một mảng')
        .custom((value) => {
            if (value.length === 0) {
                throw new Error('Phải có ít nhất một role');
            }
            return true;
        }),
    body('roles.*')
        .isString()
        .withMessage('Mỗi role phải là một chuỗi')
        .trim()
        .notEmpty()
        .withMessage('Role không được để trống'),
];

// Validation rules cho reset password
export const resetPasswordValidation = [
    body('newPassword')
        .notEmpty()
        .withMessage('Mật khẩu mới không được để trống')
        .isLength({ min: 6, max: 100 })
        .withMessage('Mật khẩu mới phải từ 6 đến 100 ký tự'),
];

// Middleware để xử lý validation errors
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        return res.status(400).json({
            message: errorMessages[0] || 'Dữ liệu không hợp lệ',
            errors: errorMessages,
        });
    }
    next();
};

