import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { connectDB } from './src/config/db.js';
import authRoutes from './src/routes/auth.js';
import recruiterRoutes from './src/routes/recruiter.js';
import candidateRoutes from './src/routes/candidate.js';
import proctorRoutes from './src/routes/proctor.js';

const app = express();

// ─── CORS (mirrors old Spring SecurityConfig) ───
// Allow localhost (any port), any *.vercel.app, and FRONTEND_URL. "*" allows all.
const frontendUrl = process.env.FRONTEND_URL;
const corsOptions = {
    origin(origin, callback) {
        if (!origin || frontendUrl === '*') return callback(null, true);
        const allowed =
            /^http:\/\/localhost:\d+$/.test(origin) ||
            /^https:\/\/.*\.vercel\.app$/.test(origin) ||
            (frontendUrl && origin === frontendUrl.replace(/\/$/, ''));
        return callback(null, allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600,
};
app.use(cors(corsOptions));

// Base64 webcam snapshots / rrweb events can be large.
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Routes ───
app.get('/ping', (req, res) => res.send('pong'));
app.get('/health', (req, res) => res.json({ status: 'active', mode: 'node-express-mongo' }));

app.use('/api/auth', authRoutes);
app.use('/api/recruiter', recruiterRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/proctor', proctorRoutes);

// ─── Centralized error handler ───
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[error]', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

// ─── Keep the (free-tier) Python AI engine warm ───
// Render free instances spin down after ~15 min idle, causing a 30-60s cold start
// on the next /assessment/generate or /candidate/evaluate call. Pinging /health
// on startup and every 10 min keeps it awake for the whole session.
const AI_URL = process.env.PYTHON_AI_URL;
async function warmAiEngine() {
    if (!AI_URL || AI_URL.includes('localhost')) return; // local AI doesn't cold-start
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 60000);
        await fetch(`${AI_URL}/health`, { signal: controller.signal });
        clearTimeout(t);
        console.log('[warm] AI engine pinged OK');
    } catch (err) {
        console.warn('[warm] AI engine ping failed:', err.message);
    }
}

connectDB()
    .then(() => {
        app.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
        warmAiEngine();                       // wake it now
        setInterval(warmAiEngine, 10 * 60 * 1000); // and keep it warm
    })
    .catch((err) => {
        console.error('[server] failed to start:', err.message);
        process.exit(1);
    });
