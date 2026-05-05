import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(String(v || '').trim());

const optionalTrimmedString = (field, { max, message }) =>
    body(field)
        .optional({ checkFalsy: true })
        .isString()
        .withMessage(message || `${field} phải là chuỗi`)
        .trim()
        .isLength({ max })
        .withMessage(message || `${field} tối đa ${max} ký tự`);

const optionalNonNegativeNumber = (field, { min = 0, max, message } = {}) => {
    const chain = body(field)
        .optional({ checkFalsy: true })
        .isFloat({ min })
        .withMessage(message || `${field} phải là số >= ${min}`)
        .toFloat();
    return max !== undefined
        ? chain.isFloat({ min, max }).withMessage(message || `${field} phải trong khoảng ${min}–${max}`)
        : chain;
};

const validateImages = body('images')
    .optional()
    .custom((v) => v === undefined || Array.isArray(v))
    .withMessage('images phải là một mảng')
    .customSanitizer((arr) =>
        Array.isArray(arr) ? arr.map((u) => String(u || '').trim()).filter(Boolean) : arr
    );

const validateImage = body('image')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('image phải là chuỗi')
    .trim();

const commonProductRules = [
    body('sku')
        .optional({ checkFalsy: false })
        .isString()
        .withMessage('SKU phải là chuỗi')
        .trim()
        .notEmpty()
        .withMessage('SKU không được để trống')
        .isLength({ max: 80 })
        .withMessage('SKU tối đa 80 ký tự'),
    body('barcode')
        .optional({ checkFalsy: true })
        .isString()
        .withMessage('Mã vạch phải là chuỗi')
        .trim()
        .isLength({ max: 80 })
        .withMessage('Mã vạch tối đa 80 ký tự'),
    body('name')
        .optional({ checkFalsy: false })
        .isString()
        .withMessage('Tên sản phẩm phải là chuỗi')
        .trim()
        .notEmpty()
        .withMessage('Tên sản phẩm không được để trống')
        .isLength({ max: 240 })
        .withMessage('Tên sản phẩm tối đa 240 ký tự'),

    optionalTrimmedString('unit', { max: 32, message: 'Đơn vị tính tối đa 32 ký tự' }),
    optionalTrimmedString('capacity', { max: 120, message: 'capacity tối đa 120 ký tự' }),
    optionalTrimmedString('batteryType', { max: 80, message: 'batteryType tối đa 80 ký tự' }),
    optionalTrimmedString('originCountry', { max: 120, message: 'originCountry tối đa 120 ký tự' }),
    optionalTrimmedString('notes', { max: 2000, message: 'notes tối đa 2000 ký tự' }),

    // refs (accept both ObjectId and empty)
    body('category')
        .optional({ checkFalsy: true })
        .custom((v) => isObjectId(v))
        .withMessage('category không hợp lệ'),
    body('brand')
        .optional({ checkFalsy: true })
        .custom((v) => isObjectId(v))
        .withMessage('brand không hợp lệ'),
    body('usageDevice')
        .optional({ checkFalsy: true })
        .custom((v) => isObjectId(v))
        .withMessage('usageDevice không hợp lệ'),

    optionalTrimmedString('categoryName', { max: 120, message: 'categoryName tối đa 120 ký tự' }),
    optionalTrimmedString('brandName', { max: 120, message: 'brandName tối đa 120 ký tự' }),

    optionalNonNegativeNumber('costPrice', { min: 0, message: 'Giá vốn phải là số >= 0' }),
    optionalNonNegativeNumber('price', { min: 0, message: 'Giá bán phải là số >= 0' }),
    optionalNonNegativeNumber('vatPercent', { min: 0, max: 100, message: 'VAT phải trong khoảng 0–100' }),

    body('warrantyYears')
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 99 })
        .withMessage('warrantyYears phải trong khoảng 0–99')
        .toInt(),
    body('warrantyMonths')
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 11 })
        .withMessage('warrantyMonths phải trong khoảng 0–11')
        .toInt(),

    optionalNonNegativeNumber('dimensionLengthMm', { min: 0, message: 'dimensionLengthMm phải là số >= 0' }),
    optionalNonNegativeNumber('dimensionWidthMm', { min: 0, message: 'dimensionWidthMm phải là số >= 0' }),
    optionalNonNegativeNumber('dimensionHeightMm', { min: 0, message: 'dimensionHeightMm phải là số >= 0' }),
    optionalNonNegativeNumber('weightKg', { min: 0, message: 'weightKg phải là số >= 0' }),
    optionalNonNegativeNumber('voltageV', { min: 0, message: 'voltageV phải là số >= 0' }),

    validateImages,
    validateImage,

    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive phải là boolean')
        .toBoolean(),

    // Disallow stock/location fields on product payload
    body('quantity').custom((v, { req }) => v === undefined).withMessage('Không được gửi quantity trong sản phẩm'),
    body('totalStock').custom((v) => v === undefined).withMessage('Không được gửi totalStock trong sản phẩm'),
    body('locationId').custom((v) => v === undefined).withMessage('Không được gửi locationId trong sản phẩm'),
];

export const createProductValidation = [
    ...commonProductRules,
    body('sku').notEmpty().withMessage('SKU không được để trống'),
    body('name').notEmpty().withMessage('Tên sản phẩm không được để trống'),
];

export const updateProductValidation = [
    param('id').custom((v) => isObjectId(v)).withMessage('id không hợp lệ'),
    ...commonProductRules.map((rule) => rule.optional ? rule : rule),
];

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

