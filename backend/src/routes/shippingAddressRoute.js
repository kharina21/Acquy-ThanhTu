import express from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { hasRole } from '../middlewares/rbac.js';
import {
    listMyShippingAddresses,
    createShippingAddress,
    updateShippingAddress,
    deleteShippingAddress,
    setDefaultShippingAddress,
} from '../controllers/shippingAddressController.js';

const router = express.Router();

router.use(authenticate);
router.use(hasRole('user', 'customer'));

router.get('/', listMyShippingAddresses);
router.post('/', createShippingAddress);
router.put('/:id', updateShippingAddress);
router.delete('/:id', deleteShippingAddress);
router.patch('/:id/default', setDefaultShippingAddress);

export default router;
