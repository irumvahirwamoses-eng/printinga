import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { documentUpload } from '../middleware/upload';
import * as ctrl from '../controllers/documentController';

const router = Router();
router.use(authenticate);

router.post('/upload', authorize('TEACHER'), documentUpload.single('file'), ctrl.uploadDocument);
router.get('/:id', ctrl.getDocument);
router.get('/:id/download', ctrl.downloadDocument);
router.get('/:id/file', ctrl.getDocumentFile);
router.get('/:id/print-html', ctrl.getDocumentPrintHtml);

export default router;
