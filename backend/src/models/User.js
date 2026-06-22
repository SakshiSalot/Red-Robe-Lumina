import mongoose from 'mongoose';

// Mirrors the old Spring `users` table / User entity.
const userSchema = new mongoose.Schema(
    {
        email: { type: String, required: true, unique: true, index: true },
        passwordHash: { type: String, required: true },
        fullName: { type: String, required: true },
        role: {
            type: String,
            required: true,
            enum: ['RECRUITER', 'CANDIDATE', 'ADMIN'],
        },
        companyName: { type: String, default: null },
        resumeUrl: { type: String, default: null },
        githubProfile: { type: String, default: null },
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
