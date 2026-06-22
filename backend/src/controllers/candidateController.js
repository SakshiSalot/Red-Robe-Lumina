import Assessment from '../models/Assessment.js';
import Submission from '../models/Submission.js';
import { evaluateSubmission } from '../services/aiClient.js';

// GET /api/candidate/assessments  -> list everything available to browse
export async function getAvailableAssessments(req, res) {
    const assessments = await Assessment.find().populate('recruiter');
    const dtos = assessments.map((a) => ({
        id: a.id,
        title: a.title,
        durationMinutes: a.durationMinutes,
        createdAt: a.createdAt,
        companyName: a.recruiter ? a.recruiter.companyName : null,
        questionCount: a.questions ? a.questions.length : 0,
    }));
    return res.json(dtos);
}

// GET /api/candidate/test/:assessmentId/start  -> questions for the test runner
export async function startTest(req, res) {
    const assessment = await Assessment.findById(req.params.assessmentId);
    if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
    }

    const questions = assessment.questions.map((q) => ({
        id: q._id.toString(),
        text: q.questionText,
        type: q.type,
        options: q.options || [],
        starterCode: q.type === 'CODING' ? q.starterCode : null,
        codingTitle: q.codingTitle || null,
        difficulty: q.difficulty || null,
        constraints: q.constraints || null,
        hints: q.hints || null,
        languageOptions: q.languageOptions || null,
        testCases: q.type === 'CODING' ? q.testCases || null : null,
    }));

    return res.json({
        assessmentId: assessment.id,
        title: assessment.title,
        durationMinutes: assessment.durationMinutes,
        questions,
    });
}

// POST /api/candidate/submit  -> save answers, call AI eval, persist results
export async function submitTest(req, res) {
    try {
        const { assessmentId, answers = [], browserEvents, responseTimings } = req.body;

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        // Index questions by id for quick lookup.
        const questionById = new Map(assessment.questions.map((q) => [q._id.toString(), q]));

        const answerEntities = [];
        const pythonAnswers = [];
        const pythonQuestions = [];

        for (const ans of answers) {
            const question = questionById.get(ans.questionId);
            if (!question) continue;

            const userResponse =
                (question.type === 'MCQ' ? ans.selectedOption : ans.codeAnswer) || '';

            answerEntities.push({
                questionId: ans.questionId,
                userAnswer: userResponse,
                isCorrect: false,
            });

            pythonAnswers.push({ question_id: ans.questionId, user_answer: userResponse });

            pythonQuestions.push({
                id: ans.questionId,
                type: question.type,
                text: question.questionText,
                options: question.options || [],
                correct_answer: question.correctAnswer ?? null,
                test_cases: question.testCases ?? null,
                rubric: question.type === 'SUBJECTIVE' ? question.rubric ?? null : null,
                expected_answer_points:
                    question.type === 'SUBJECTIVE' ? question.expectedAnswerPoints ?? null : null,
            });
        }

        const submission = await Submission.create({
            assessment: assessment._id,
            candidate: req.user._id,
            submittedAt: new Date(),
            score: 0,
            answers: answerEntities,
            browserEvents: browserEvents ?? undefined,
        });

        // Trigger AI evaluation (best-effort: submission still succeeds if AI fails).
        try {
            const aiResult = await evaluateSubmission({
                candidate_id: req.user._id.toString(),
                assessment_id: assessmentId,
                questions: pythonQuestions,
                answers: pythonAnswers,
                resume_text: null,
                response_timings: responseTimings ?? null,
                browser_events: browserEvents ?? null,
            });

            if (aiResult) {
                // UI shows score out of 100, so store the percentage (not raw points).
                if (aiResult.percentage != null) submission.score = Math.round(aiResult.percentage);
                else if (aiResult.total_score != null) submission.score = Math.round(aiResult.total_score);
                submission.aiFeedback = aiResult.overall_feedback ?? null;
                submission.integrityScore = aiResult.integrity_score ?? null;
                submission.skillScores = aiResult.skill_scores ?? null;
                submission.strengths = aiResult.strengths ?? undefined;
                submission.weaknesses = aiResult.weaknesses ?? undefined;
                submission.integrityFlags = aiResult.integrity_flags ?? undefined;
                await submission.save();
            }
        } catch (err) {
            console.error('[submit] AI evaluation failed:', err.message);
        }

        return res.json({
            message: 'Test submitted successfully. Evaluation in progress.',
            submissionId: submission.id,
            status: 'SUBMITTED',
        });
    } catch (err) {
        console.error('[submit] failed:', err);
        return res.status(500).json({ error: `Submission failed: ${err.message}` });
    }
}

// GET /api/candidate/submissions  -> history with scores & feedback
export async function getMySubmissions(req, res) {
    const submissions = await Submission.find({ candidate: req.user._id })
        .populate({ path: 'assessment', populate: { path: 'recruiter' } })
        .sort({ submittedAt: -1 });

    const result = submissions.map((s) => {
        const assessment = s.assessment;
        return {
            id: s.id,
            assessmentId: assessment ? assessment.id : null,
            assessmentTitle: assessment ? assessment.title : 'Unknown',
            companyName: assessment && assessment.recruiter ? assessment.recruiter.companyName : 'Unknown',
            score: s.score,
            integrityScore: s.integrityScore,
            aiFeedback: s.aiFeedback,
            // Legacy "*Json" fields: the frontend JSON.parse()s these strings.
            skillScoresJson: s.skillScores != null ? JSON.stringify(s.skillScores) : null,
            strengthsJson: s.strengths != null ? JSON.stringify(s.strengths) : null,
            weaknessesJson: s.weaknesses != null ? JSON.stringify(s.weaknesses) : null,
            submittedAt: s.submittedAt,
            status: s.score != null && s.score > 0 ? 'EVALUATED' : 'SUBMITTED',
        };
    });

    return res.json(result);
}
