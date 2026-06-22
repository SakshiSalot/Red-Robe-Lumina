// End-to-end smoke test against the running backend.
const BASE = 'http://localhost:8080';
const stamp = Date.now();
const recruiterEmail = `rec_${stamp}@test.com`;
const candidateEmail = `cand_${stamp}@test.com`;
const PASS = 'Passw0rd!';

let pass = 0, fail = 0;
function check(name, ok, detail = '') {
    if (ok) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name}  ${detail}`); }
}

async function req(method, path, { token, body, raw } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body && !raw) headers['Content-Type'] = 'application/json';
    const res = await fetch(BASE + path, {
        method,
        headers,
        body: body ? (raw ? body : JSON.stringify(body)) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* plain text */ }
    return { status: res.status, ok: res.ok, text, json };
}

(async () => {
    console.log('\n=== 1. Health ===');
    let r = await req('GET', '/health');
    check('GET /health', r.ok && r.json?.status === 'active', `status=${r.status} body=${r.text}`);

    console.log('\n=== 2. Auth ===');
    r = await req('POST', '/api/auth/register', {
        body: { fullName: 'Test Recruiter', email: recruiterEmail, password: PASS, role: 'RECRUITER', companyName: 'Acme' },
    });
    const recToken = r.json?.token;
    check('register recruiter -> token+role', !!recToken && r.json?.role === 'RECRUITER', `status=${r.status} body=${r.text}`);

    r = await req('POST', '/api/auth/register', {
        body: { fullName: 'Test Candidate', email: candidateEmail, password: PASS, role: 'CANDIDATE', githubProfile: 'gh/test' },
    });
    let candToken = r.json?.token;
    check('register candidate -> token+role', !!candToken && r.json?.role === 'CANDIDATE', `status=${r.status} body=${r.text}`);

    r = await req('POST', '/api/auth/login', { body: { email: recruiterEmail, password: PASS } });
    check('login recruiter', r.ok && !!r.json?.token, `status=${r.status} body=${r.text}`);

    r = await req('POST', '/api/auth/login', { body: { email: recruiterEmail, password: 'wrong' } });
    check('login wrong password -> 401', r.status === 401, `status=${r.status}`);

    console.log('\n=== 3. Auth guards ===');
    r = await req('GET', '/api/recruiter/assessments');
    check('no token -> 401', r.status === 401, `status=${r.status}`);
    r = await req('GET', '/api/recruiter/assessments', { token: candToken });
    check('candidate on recruiter route -> 403', r.status === 403, `status=${r.status}`);

    console.log('\n=== 4. Create assessment (calls Python AI; may be slow on cold start) ===');
    r = await req('POST', '/api/recruiter/create-assessment-json', {
        token: recToken,
        body: { jobDescription: 'Backend engineer skilled in Node.js, Express, MongoDB and REST API design.', title: 'Smoke Test Role', questionCount: 5, durationMinutes: 30 },
    });
    const idMatch = r.text.match(/ID:\s*([a-f0-9]{24})/i);
    const assessmentId = idMatch ? idMatch[1] : null;
    check('create-assessment-json -> ID', r.ok && !!assessmentId, `status=${r.status} body=${r.text.slice(0, 300)}`);

    if (!assessmentId) {
        console.log('\n⚠️  Cannot continue test flow without an assessment (AI engine likely unreachable).');
        console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
        process.exit(fail ? 1 : 0);
    }

    r = await req('GET', '/api/recruiter/assessments', { token: recToken });
    check('recruiter assessments list', r.ok && Array.isArray(r.json) && r.json.some(a => a.id === assessmentId), `status=${r.status}`);

    r = await req('GET', '/api/recruiter/dashboard-stats', { token: recToken });
    check('dashboard-stats', r.ok && r.json?.totalAssessments >= 1, `status=${r.status} body=${r.text}`);

    console.log('\n=== 5. Candidate flow ===');
    r = await req('GET', '/api/candidate/assessments', { token: candToken });
    check('candidate browse assessments', r.ok && Array.isArray(r.json) && r.json.some(a => a.id === assessmentId), `status=${r.status}`);

    r = await req('GET', `/api/candidate/test/${assessmentId}/start`, { token: candToken });
    const questions = r.json?.questions || [];
    check('start test -> questions', r.ok && questions.length > 0, `status=${r.status} qCount=${questions.length}`);

    // Build answers: pick first option for MCQ, dummy code for coding/subjective.
    const answers = questions.map(q => ({
        questionId: q.id,
        selectedOption: q.type === 'MCQ' ? (q.options?.[0] || 'A') : null,
        codeAnswer: q.type === 'MCQ' ? null : 'function solution(){ return 42; }',
    }));

    console.log('\n=== 6. Submit (calls Python AI eval; may be slow) ===');
    r = await req('POST', '/api/candidate/submit', {
        token: candToken,
        body: { assessmentId, answers, browserEvents: [], responseTimings: [] },
    });
    const submissionId = r.json?.submissionId;
    check('submit -> submissionId', r.ok && !!submissionId && r.json?.status === 'SUBMITTED', `status=${r.status} body=${r.text.slice(0, 300)}`);

    r = await req('GET', '/api/candidate/submissions', { token: candToken });
    check('candidate submissions history', r.ok && Array.isArray(r.json) && r.json.some(s => s.id === submissionId), `status=${r.status}`);

    console.log('\n=== 7. Proctor logs ===');
    if (submissionId) {
        r = await req('POST', '/api/proctor/batch-log', {
            token: candToken,
            body: [
                { submissionId, logType: 'SNAPSHOT', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', sequenceNumber: 0 },
                { submissionId, logType: 'TAB_SWITCH', data: JSON.stringify({ at: 5 }), sequenceNumber: 1 },
            ],
        });
        check('proctor batch-log', r.ok, `status=${r.status}`);
    }

    console.log('\n=== 8. Leaderboard & integrity ===');
    r = await req('GET', `/api/recruiter/assessment/${assessmentId}/leaderboard`, { token: recToken });
    check('leaderboard', r.ok && Array.isArray(r.json), `status=${r.status} body=${r.text.slice(0,200)}`);

    if (submissionId) {
        r = await req('GET', `/api/recruiter/submission/${submissionId}/integrity`, { token: recToken });
        check('integrity report', r.ok && r.json?.submissionId === submissionId && Array.isArray(r.json?.snapshots), `status=${r.status}`);
    }

    console.log('\n=== 9. Cleanup (delete assessment cascades) ===');
    r = await req('DELETE', `/api/recruiter/assessment/${assessmentId}`, { token: recToken });
    check('delete assessment', r.ok, `status=${r.status} body=${r.text}`);

    console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
