import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
    createAssessmentJson,
    createAssessmentFromPdf,
    getRecruiterAssessments,
    getDashboardStats,
    deleteAssessment,
    getLeaderboard,
    getIntegrityReport,
} from '../controllers/recruiterController.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All recruiter routes require an authenticated RECRUITER.
router.use(asyncHandler(authenticate), requireRole('RECRUITER'));

router.post('/create-assessment-json', asyncHandler(createAssessmentJson));
router.post('/create-assessment', upload.single('file'), asyncHandler(createAssessmentFromPdf));
router.get('/assessments', asyncHandler(getRecruiterAssessments));
router.get('/dashboard-stats', asyncHandler(getDashboardStats));
router.delete('/assessment/:id', asyncHandler(deleteAssessment));
router.get('/assessment/:id/leaderboard', asyncHandler(getLeaderboard));
router.get('/submission/:submissionId/integrity', asyncHandler(getIntegrityReport));

export default router;
