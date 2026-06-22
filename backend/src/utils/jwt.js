import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'devscoreai_jwt_secret_key_2024_change_me';
const EXPIRATION_MS = parseInt(process.env.JWT_EXPIRATION_MS || '86400000', 10);

// Matches the old Spring JwtUtils: subject = email, custom "role" claim, HS256.
export function generateToken(email, role) {
    return jwt.sign({ role }, SECRET, {
        subject: email,
        algorithm: 'HS256',
        expiresIn: Math.floor(EXPIRATION_MS / 1000),
    });
}

export function verifyToken(token) {
    // Throws if invalid/expired. Returns the decoded payload (with `sub` and `role`).
    return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}
