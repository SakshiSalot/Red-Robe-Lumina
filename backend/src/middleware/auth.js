import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';

// Reads the Bearer token, validates it, loads the user, and attaches it to req.
// Mirrors the old JwtAuthenticationFilter + UserDetailsServiceImpl.
export async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    const token = authHeader.substring(7);
    let payload;
    try {
        payload = verifyToken(token);
    } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const email = payload.sub;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
}

// Role guard. Use after authenticate, e.g. requireRole('RECRUITER').
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Requires role: ${roles.join(' or ')}` });
        }
        next();
    };
}
