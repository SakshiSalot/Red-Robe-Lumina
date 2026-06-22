import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logProctorEvent, logBatch } from '../controllers/proctorController.js';

const router = Router();

// Proctor logging requires any authenticated user (the candidate taking the test).
router.use(asyncHandler(authenticate));

router.post('/log', asyncHandler(logProctorEvent));
router.post('/batch-log', asyncHandler(logBatch));

export default router;
