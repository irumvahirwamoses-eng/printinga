import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as ctrl from '../controllers/teacherController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/\.(csv|xlsx)$/i.test(file.originalname)) return cb(new Error('Only .csv and .xlsx files are allowed'));
    cb(null, true);
  },
});

router.use(authenticate, authorize('OFFICER'));

router.post('/', validate(ctrl.createTeacherSchema), ctrl.createTeacher);
router.post('/bulk-import/preview', upload.single('file'), ctrl.previewBulkImport);
router.post('/bulk-import', upload.single('file'), ctrl.confirmBulkImport);
router.get('/', ctrl.listTeachers);
router.get('/:id', ctrl.getTeacher);
router.patch('/:id', validate(ctrl.updateTeacherSchema), ctrl.updateTeacher);
router.patch('/:id/status', validate(ctrl.setTeacherStatusSchema), ctrl.setTeacherStatus);
router.post('/:id/reset-password', ctrl.resetTeacherPassword);

export default router;
