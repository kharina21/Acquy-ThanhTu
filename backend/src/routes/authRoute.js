import express from 'express';
import { registerUser, login } from '../controllers/authController.js';
import { registerValidation, handleValidationErrors } from '../validators/authValidator.js';

const router = express.Router();
router.post('/register-user', registerValidation, handleValidationErrors, registerUser);
router.post('/login', login);
// router.post('/logout', logout);
// router.post('/refresh', refresh);
// router.post('/forgot-password', forgotPassword);
// router.post('/reset-password', resetPassword);
// router.post('/verify-email', verifyEmail);
// router.post('/send-verification-email', sendVerificationEmail);

export default router;
