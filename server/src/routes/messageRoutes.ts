import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/messageController';

const router = Router();
router.use(authenticate);

router.get('/requests/:id/messages', ctrl.getMessages);
router.post('/requests/:id/messages', validate(ctrl.sendMessageSchema), ctrl.sendMessage);

export default router;
