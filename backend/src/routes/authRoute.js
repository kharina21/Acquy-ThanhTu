import express from "express";
import {
    registerUser,
    login,
    getCurrentUser,
    updateProfile,
    sendVerificationCode,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
    logout,
    refreshToken,
} from "../controllers/authController.js";
import {
    registerValidation,
    updateProfileValidation,
    verifyEmailValidation,
    handleValidationErrors,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,
} from "../validators/authValidator.js";

import { authenticate } from "../middlewares/authenticate.js";

const router = express.Router();
router.post(
    "/register-user",
    registerValidation,
    handleValidationErrors,
    registerUser
);
router.post("/login", login);

// Lấy thông tin user hiện tại
router.get("/me", authenticate, getCurrentUser);

// Cập nhật thông tin profile
router.put(
    "/profile",
    authenticate,
    updateProfileValidation,
    handleValidationErrors,
    updateProfile
);

// Gửi mã xác thực email
router.post("/send-verification-email", authenticate, sendVerificationCode);

// Xác thực email với mã
router.post(
    "/verify-email",
    authenticate,
    verifyEmailValidation,
    handleValidationErrors,
    verifyEmail
);


// Quên mật khẩu - Gửi email reset
router.post(
    "/forgot-password",
    forgotPasswordValidation,
    handleValidationErrors,
    forgotPassword
);

// Đặt lại mật khẩu với token
router.post(
    "/reset-password",
    resetPasswordValidation,
    handleValidationErrors,
    resetPassword
);

// Đổi mật khẩu (cần mật khẩu hiện tại)
router.put(
    "/change-password",
    authenticate,
    changePasswordValidation,
    handleValidationErrors,
    changePassword
);

router.post("/logout", logout);
router.get("/refresh", refreshToken);
// router.post('/verify-email', verifyEmail);
// router.post('/send-verification-email', sendVerificationEmail);

export default router;
