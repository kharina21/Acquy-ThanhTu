import express from "express";
import {
    registerUser,
    login,
    getCurrentUser,
    updateProfile,
    sendVerificationCode,
    verifyEmail,
    logout,
    refreshToken,
} from "../controllers/authController.js";
import {
    registerValidation,
    updateProfileValidation,
    verifyEmailValidation,
    handleValidationErrors,
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

router.get("/me", authenticate, getCurrentUser); // Lấy thông tin user hiện tại
router.put(
    "/profile",
    authenticate,
    updateProfileValidation,
    handleValidationErrors,
    updateProfile
); // Cập nhật thông tin profile
router.post("/send-verification-email", authenticate, sendVerificationCode); // Gửi mã xác thực email
router.post(
    "/verify-email",
    authenticate,
    verifyEmailValidation,
    handleValidationErrors,
    verifyEmail
); // Xác thực email với mã
router.post("/logout", logout);
router.get("/refresh", refreshToken);

// router.post('/logout', logout);
// router.post('/refresh', refresh);
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword);
// router.post('/verify-email', verifyEmail);
// router.post('/send-verification-email', sendVerificationEmail);

export default router;
