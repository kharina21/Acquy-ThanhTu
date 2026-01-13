import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import {
    createNotification,
    createNotificationForRoles,
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
} from '../controllers/notificationController.js';
import { hasRole } from '../middlewares/rbac.js';

const router = express.Router();

// Public routes (cần authenticate)
router.get('/me', authenticate, getMyNotifications);
router.get('/unread-count', authenticate, getUnreadCount);
router.put('/:id/read', authenticate, markAsRead);
router.put('/read-all', authenticate, markAllAsRead);
router.delete('/:id', authenticate, deleteNotification);
router.delete('/read/all', authenticate, deleteAllRead);

// Admin/Owner/Manager routes
router.post('/', authenticate, hasRole('admin', 'owner', 'manager'), createNotification);
router.post(
    '/roles',
    authenticate,
    hasRole('admin', 'owner', 'manager'),
    createNotificationForRoles
);

export default router;
