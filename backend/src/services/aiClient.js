import axios from 'axios';

const AI_BASE_URL = process.env.PYTHON_AI_URL || 'https://ai-assessment-platform.onrender.com';

const http = axios.create({
    baseURL: AI_BASE_URL,
    timeout: 240000, // AI generation/eval can be slow (LLM + Render cold starts ~60-90s)
    headers: { 'Content-Type': 'application/json' },
});

// Best available text for a question (mirrors AiQuestion.getQuestionText()).
function questionText(q) {
    if (q.problem_statement && q.problem_statement.trim()) return q.problem_statement;
    if (q.question && q.question.trim()) return q.question;
    if (q.title && q.title.trim()) return q.title;
    return 'No question text available';
}

// Normalize AI MCQ options ([{label,text,is_correct}] or ["A","B"]) to "A. text" strings.
function normalizeOptions(options) {
    if (!Array.isArray(options)) return undefined;
    return options.map((opt) => {
        if (typeof opt === 'string') return opt;
        const label = opt.label != null ? String(opt.label) : '';
        const text = opt.text != null ? String(opt.text) : '';
        return label === '' ? text : `${label}. ${text}`;
    });
}

/**
 * Generate questions for an assessment by calling the Python engine, then map
 * the response into embedded `question` subdocuments. Mirrors
 * AiIntegrationService.generateQuestions + mapResponseToEntities.
 */
export async function generateQuestions(jobDescriptionText, totalQuestionCount) {
    // Distribute: ~60% MCQ, ~25% subjective, ~15% coding (minimum 1 each).
    const mcqCount = Math.max(1, Math.round(totalQuestionCount * 0.6));
    const subjectiveCount = Math.max(1, Math.round(totalQuestionCount * 0.25));
    const codingCount = Math.max(1, totalQuestionCount - mcqCount - subjectiveCount);

    const { data } = await http.post('/api/assessment/generate', {
        jd_text: jobDescriptionText,
        mcq_count: mcqCount,
        subjective_count: subjectiveCount,
        coding_count: codingCount,
    });

    const questions = [];

    for (const q of data.mcq_questions || []) {
        questions.push({
            questionText: questionText(q),
            type: 'MCQ',
            options: normalizeOptions(q.options),
            correctAnswer: q.correct_answer ?? null,
        });
    }

    for (const q of data.subjective_questions || []) {
        questions.push({
            questionText: questionText(q),
            type: 'SUBJECTIVE',
            rubric: q.rubric ?? null,
            expectedAnswerPoints: q.expected_answer_points ?? undefined,
        });
    }

    for (const q of data.coding_questions || []) {
        questions.push({
            questionText: questionText(q),
            type: 'CODING',
            testCases: q.test_cases ?? undefined,
            starterCode: q.starter_code ?? null,
            correctAnswer: q.starter_code ?? null, // legacy parity: starter code stored here too
            codingTitle: q.title ?? null,
            difficulty: q.difficulty ?? null,
            constraints: q.constraints ?? undefined,
            hints: q.hints ?? undefined,
            languageOptions: q.language_options ?? undefined,
        });
    }

    return questions;
}

/**
 * Send a full evaluation request to the Python engine and return the raw
 * response object. Mirrors AiIntegrationService.evaluateSubmission.
 * @param {object} payload already in Python's snake_case shape
 */
export async function evaluateSubmission(payload) {
    const { data } = await http.post('/api/candidate/evaluate', payload);
    return data;
}
