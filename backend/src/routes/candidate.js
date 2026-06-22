import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
    getAvailableAssessments,
    startTest,
    submitTest,
    getMySubmissions,
} from '../controllers/candidateController.js';

const router = Router();

// All candidate routes require an authenticated CANDIDATE.
router.use(asyncHandler(authenticate), requireRole('CANDIDATE'));

router.get('/assessments', asyncHandler(getAvailableAssessments));
router.get('/test/:assessmentId/start', asyncHandler(startTest));
router.post('/submit', asyncHandler(submitTest));
router.get('/submissions', asyncHandler(getMySubmissions));

export default router;
