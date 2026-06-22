import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';

// POST /api/auth/register  -> { token, role }
export async function register(req, res) {
    const { fullName, email, password, role, companyName, githubProfile } = req.body;

    if (!email || !password || !role || !fullName) {
        return res.status(400).json({ message: 'fullName, email, password and role are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
        return res.status(400).json({ message: 'Error: Email is already in use!' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
        fullName,
        email,
        passwordHash,
        role,
        companyName: companyName ?? null,
        githubProfile: githubProfile ?? null,
    });

    const token = generateToken(user.email, user.role);
    return res.json({ token, role: user.role });
}

// POST /api/auth/login  -> { token, role }
export async function login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user.email, user.role);
    return res.json({ token, role: user.role });
}
