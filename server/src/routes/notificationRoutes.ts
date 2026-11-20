import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as ctrl from '../controllers/notificationController';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listNotifications);
router.patch('/:id/read', ctrl.markRead);
router.patch('/read-all', ctrl.markAllRead);

export default router;
