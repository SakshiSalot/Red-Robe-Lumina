# Lumina Backend (Node / Express / MongoDB)

This replaces the old Spring Boot service. It exposes the **same HTTP API** the React
frontend already calls, and proxies AI work to the unchanged Python FastAPI engine.

```
React (Vercel)  ──HTTP/JSON──>  this Express API  ──HTTP/JSON──>  Python AI engine
                                      │
                                      └──> MongoDB Atlas
```

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then fill in MONGODB_URI, JWT_SECRET, PYTHON_AI_URL
npm run dev                 # or: npm start
```

The server listens on `PORT` (default 8080).

## Environment variables

| Var | Purpose |
|-----|---------|
| `PORT` | Port to listen on (default 8080) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | HS256 signing secret for auth tokens |
| `JWT_EXPIRATION_MS` | Token lifetime in ms (default 86400000 = 24h) |
| `PYTHON_AI_URL` | Base URL of the Python AI engine |
| `FRONTEND_URL` | Allowed CORS origin (`*` = allow all). localhost & `*.vercel.app` are always allowed |

## API (unchanged from Spring Boot)

**Auth** — `POST /api/auth/register`, `POST /api/auth/login` → `{ token, role }`

**Recruiter** (role RECRUITER)
- `POST /api/recruiter/create-assessment-json` — `{ jobDescription, title?, questionCount?, durationMinutes? }`
- `POST /api/recruiter/create-assessment` — multipart `file` + `title`
- `GET  /api/recruiter/assessments`
- `GET  /api/recruiter/dashboard-stats`
- `DELETE /api/recruiter/assessment/:id`
- `GET  /api/recruiter/assessment/:id/leaderboard`
- `GET  /api/recruiter/submission/:submissionId/integrity`

**Candidate** (role CANDIDATE)
- `GET  /api/candidate/assessments`
- `GET  /api/candidate/test/:assessmentId/start`
- `POST /api/candidate/submit`
- `GET  /api/candidate/submissions`

**Proctor** (any authenticated user)
- `POST /api/proctor/log`
- `POST /api/proctor/batch-log`

**Health** — `GET /ping`, `GET /health`

## Data model (MongoDB collections)

- `users` — fullName, email, passwordHash (bcrypt), role, companyName, githubProfile
- `assessments` — title, jobDescriptionText, durationMinutes, recruiter ref, **questions embedded**
- `submissions` — assessment/candidate refs, score, aiFeedback, skillScores, strengths, weaknesses, integrityScore, integrityFlags, answers embedded
- `proctorlogs` — submission ref, logType, snapshotBase64 / activityLogJson, timestamp

## Pointing the frontend here

The React services read `import.meta.env.VITE_API_BASE_URL` (falling back to the old
Render URL). For local dev, create a `.env` in the project root:

```
VITE_API_BASE_URL=http://localhost:8080
```

For production, set `VITE_API_BASE_URL` to this service's deployed URL in your Vercel
project settings.
