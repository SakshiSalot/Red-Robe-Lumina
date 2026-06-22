import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import ProctorLog from '../models/ProctorLog.js';
import { generateQuestions } from '../services/aiClient.js';
import { extractTextFromPdf } from '../services/pdfExtractor.js';

// POST /api/recruiter/create-assessment-json  (returns plain text, like the old API)
export async function createAssessmentJson(req, res) {
    const { jobDescription } = req.body;
    const title = req.body.title || `Assessment - ${new Date().toISOString().slice(0, 10)}`;
    const questionCount = req.body.questionCount != null ? Number(req.body.questionCount) : 8;
    const durationMinutes = req.body.durationMinutes != null ? Number(req.body.durationMinutes) : 60;

    if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).send('jobDescription is required');
    }

    const questions = await generateQuestions(jobDescription, questionCount);
    const assessment = await Assessment.create({
        title,
        jobDescriptionText: jobDescription,
        durationMinutes,
        recruiter: req.user._id,
        questions,
    });

    return res.send(`Assessment created successfully! ID: ${assessment.id}`);
}

// POST /api/recruiter/create-assessment  (multipart PDF upload)
export async function createAssessmentFromPdf(req, res) {
    if (!req.file) {
        return res.status(400).send('A PDF file is required');
    }
    const title = req.body.title || `Assessment - ${new Date().toISOString().slice(0, 10)}`;

    const extractedText = await extractTextFromPdf(req.file.buffer);
    const questions = await generateQuestions(extractedText, 8);

    const assessment = await Assessment.create({
        title,
        jobDescriptionText: extractedText,
        durationMinutes: 60,
        recruiter: req.user._id,
        questions,
    });

    return res.send(`Assessment created successfully! ID: ${assessment.id}`);
}

// GET /api/recruiter/assessments
export async function getRecruiterAssessments(req, res) {
    const assessments = await Assessment.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    const result = assessments.map((a) => ({
        id: a.id,
        title: a.title,
        durationMinutes: a.durationMinutes,
        createdAt: a.createdAt,
        questionCount: a.questions ? a.questions.length : 0,
    }));
    return res.json(result);
}

// GET /api/recruiter/dashboard-stats
export async function getDashboardStats(req, res) {
    const assessments = await Assessment.find({ recruiter: req.user._id });
    const totalAssessments = assessments.length;
    const totalQuestions = assessments.reduce((sum, a) => sum + (a.questions ? a.questions.length : 0), 0);
    return res.json({ totalAssessments, totalQuestions });
}

// DELETE /api/recruiter/assessment/:id
export async function deleteAssessment(req, res) {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) {
        return res.status(404).send('Assessment not found');
    }
    if (assessment.recruiter.toString() !== req.user._id.toString()) {
        return res.status(403).send('You can only delete your own assessments');
    }

    // Cascade: remove submissions and their proctor logs.
    const submissions = await Submission.find({ assessment: assessment._id });
    const submissionIds = submissions.map((s) => s._id);
    await ProctorLog.deleteMany({ submission: { $in: submissionIds } });
    await Submission.deleteMany({ assessment: assessment._id });
    await assessment.deleteOne();

    return res.send('Assessment deleted successfully');
}

// GET /api/recruiter/assessment/:id/leaderboard
export async function getLeaderboard(req, res) {
    const submissions = await Submission.find({ assessment: req.params.id })
        .populate('candidate')
        .sort({ score: -1 });

    const entries = [];
    for (const sub of submissions) {
        const logCount = await ProctorLog.countDocuments({ submission: sub._id });
        const status = logCount > 5 ? 'FLAGGED' : 'COMPLETED';
        entries.push({
            candidateId: sub.candidate ? sub.candidate.id : null,
            candidateName: sub.candidate ? sub.candidate.fullName : 'Unknown',
            email: sub.candidate ? sub.candidate.email : null,
            score: sub.score,
            status,
            submittedAt: sub.submittedAt,
        });
    }
    return res.json(entries);
}

// GET /api/recruiter/submission/:submissionId/integrity
export async function getIntegrityReport(req, res) {
    const submission = await Submission.findById(req.params.submissionId);
    if (!submission) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    const logs = await ProctorLog.find({ submission: submission._id }).sort({ timestamp: 1 });

    const snapshots = [];
    const events = [];
    const startTime = logs.length ? logs[0].timestamp : null;

    const withPrefix = (b64) =>
        b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;

    for (const log of logs) {
        const timeOffset =
            startTime && log.timestamp
                ? Math.floor((log.timestamp.getTime() - startTime.getTime()) / 1000)
                : 0;

        if (log.logType === 'SNAPSHOT') {
            snapshots.push({
                id: log.id,
                image: log.snapshotBase64 ? withPrefix(log.snapshotBase64) : null,
                timestamp: log.timestamp ? log.timestamp.toISOString() : null,
                timeOffset,
                reason: 'Periodic Capture',
            });
        } else if (log.logType === 'REPLAY') {
            if (log.activityLogJson) {
                try {
                    const parsed = JSON.parse(log.activityLogJson);
                    if (Array.isArray(parsed)) events.push(...parsed);
                    else events.push(parsed);
                } catch {
                    // skip unparseable
                }
            }
        } else if (log.snapshotBase64) {
            // TAB_SWITCH, BLUR, ANOMALY, FULL_SCREEN_EXIT with an attached frame
            snapshots.push({
                id: log.id,
                image: withPrefix(log.snapshotBase64),
                timestamp: log.timestamp ? log.timestamp.toISOString() : null,
                timeOffset,
                reason: `Suspect: ${log.logType}`,
            });
        }
    }

    return res.json({
        submissionId: submission.id,
        integrityScore: submission.integrityScore,
        snapshots,
        events,
    });
}
