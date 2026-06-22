import mongoose from 'mongoose';

// Answers were a separate `submission_answers` table; embedded here.
const answerSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    userAnswer: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
});

const submissionSchema = new mongoose.Schema(
    {
        assessment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', required: true, index: true },
        candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        submittedAt: { type: Date, default: Date.now },
        score: { type: Number, default: 0 },

        // AI evaluation results (native objects/arrays; serialized to JSON
        // strings only when the frontend expects the legacy "*Json" fields).
        aiFeedback: { type: String, default: null },
        skillScores: { type: mongoose.Schema.Types.Mixed, default: null },
        strengths: { type: [String], default: undefined },
        weaknesses: { type: [String], default: undefined },

        // Proctoring / integrity
        integrityScore: { type: Number, default: null },
        integrityFlags: { type: [String], default: undefined },
        browserEvents: { type: [mongoose.Schema.Types.Mixed], default: undefined },

        answers: { type: [answerSchema], default: [] },
    },
    { timestamps: true }
);

export default mongoose.model('Submission', submissionSchema);
