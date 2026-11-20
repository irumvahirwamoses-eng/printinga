import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/printerController';

const router = Router();
router.use(authenticate, authorize('OFFICER'));

router.get('/', ctrl.listPrinters);
router.post('/', validate(ctrl.createPrinterSchema), ctrl.createPrinter);
router.patch('/:id', validate(ctrl.updatePrinterSchema), ctrl.updatePrinter);

export default router;
