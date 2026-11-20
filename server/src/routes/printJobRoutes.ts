import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/printJobController';

const router = Router();
router.use(authenticate, authorize('OFFICER'));

router.post('/', validate(ctrl.createPrintJobSchema), ctrl.createPrintJob);
router.get('/', ctrl.listPrintJobs);
router.get('/:id', ctrl.getPrintJob);
router.post('/:id/confirm', ctrl.confirmPrintJob);
router.post('/:id/failure', ctrl.failPrintJob);

export default router;
