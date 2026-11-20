import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { loginLimiter, passwordResetLimiter, refreshLimiter } from '../middleware/rateLimit';
import * as ctrl from '../controllers/authController';

const router = Router();

router.post('/login', loginLimiter, validate(ctrl.loginSchema), ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh', refreshLimiter, ctrl.refresh);
router.get('/me', authenticate, ctrl.me);
router.patch('/profile', authenticate, validate(ctrl.updateProfileSchema), ctrl.updateProfile);
router.post('/change-password', authenticate, validate(ctrl.changePasswordSchema), ctrl.changePassword);
router.post('/forgot-password', passwordResetLimiter, validate(ctrl.forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate(ctrl.resetPasswordSchema), ctrl.resetPassword);

export default router;
