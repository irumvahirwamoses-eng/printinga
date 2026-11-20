import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import * as ctrl from '../controllers/reportController';

const router = Router();
router.use(authenticate, authorize('OFFICER'));

router.get('/overview', ctrl.overview);
router.get('/printing', ctrl.printing);
router.get('/teachers', ctrl.teachers);
router.get('/export', ctrl.exportReport);

export default router;
