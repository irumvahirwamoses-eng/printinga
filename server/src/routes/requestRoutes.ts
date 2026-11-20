import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/requestController';

const router = Router();
router.use(authenticate);

router.post('/', authorize('TEACHER'), validate(ctrl.createRequestSchema), ctrl.createRequest);
router.get('/', ctrl.listRequests);
router.get('/stats', ctrl.stats);
router.get('/:id', ctrl.getRequest);
router.get('/:id/history', ctrl.getHistory);
router.patch('/:id/status', validate(ctrl.changeStatusSchema), ctrl.changeStatus);
router.post('/:id/cancel', authorize('TEACHER'), ctrl.cancelRequest);

export default router;
