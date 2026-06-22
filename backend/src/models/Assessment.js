import mongoose from 'mongoose';

// Questions were a separate `questions` table in Spring. They are owned entirely
// by an assessment, so in MongoDB we embed them as a subdocument array.
// Fields stored natively (objects/arrays) instead of the old "*Json" TEXT columns.
const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'SUBJECTIVE', 'CODING'], required: true },

    // MCQ: normalized option strings, e.g. "A. Some text"
    options: { type: [String], default: undefined },
    // MCQ / coding: the correct answer or (for coding) the starter code
    correctAnswer: { type: String, default: null },

    // SUBJECTIVE grading criteria
    rubric: { type: mongoose.Schema.Types.Mixed, default: null },
    expectedAnswerPoints: { type: [String], default: undefined },

    // CODING metadata
    starterCode: { type: String, default: null },
    testCases: { type: [mongoose.Schema.Types.Mixed], default: undefined },
    codingTitle: { type: String, default: null },
    difficulty: { type: String, default: null },
    constraints: { type: [String], default: undefined },
    hints: { type: [String], default: undefined },
    languageOptions: { type: [String], default: undefined },
});

const assessmentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        jobDescriptionText: { type: String, default: '' },
        durationMinutes: { type: Number, default: 60 },
        recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        questions: { type: [questionSchema], default: [] },
    },
    { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.model('Assessment', assessmentSchema);
