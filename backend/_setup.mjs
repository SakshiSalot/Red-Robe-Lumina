import { writeFileSync } from 'fs';
const BASE = 'http://localhost:8080';
const stamp = Date.now();
const rec = `rec_${stamp}@t.com`, cand = `cand_${stamp}@t.com`, PASS = 'Passw0rd!';

async function j(method, path, token, body) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    const res = await fetch(BASE + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const t = await res.text(); let d = null; try { d = JSON.parse(t); } catch {}
    return { status: res.status, text: t, json: d };
}

const t0 = Date.now();
const r1 = await j('POST', '/api/auth/register', null, { fullName: 'R', email: rec, password: PASS, role: 'RECRUITER', companyName: 'Acme' });
const recToken = r1.json.token;
const r2 = await j('POST', '/api/auth/register', null, { fullName: 'C', email: cand, password: PASS, role: 'CANDIDATE' });
const candToken = r2.json.token;
console.log('registered both roles');

console.log('creating assessment (AI generation)...');
const c = await j('POST', '/api/recruiter/create-assessment-json', recToken, {
    jobDescription: 'Backend engineer: Node.js, Express, MongoDB, REST APIs.', title: 'Probe', questionCount: 4, durationMinutes: 30,
});
const id = (c.text.match(/ID:\s*([a-f0-9]{24})/i) || [])[1];
console.log(`create status=${c.status} id=${id} (${((Date.now()-t0)/1000).toFixed(1)}s)`);
if (!id) { console.log('NO ID:', c.text.slice(0, 300)); process.exit(1); }

const s = await j('GET', `/api/candidate/test/${id}/start`, candToken);
const questions = s.json.questions;
console.log(`start status=${s.status} questions=${questions.length} types=${questions.map(q=>q.type).join(',')}`);

writeFileSync('_ctx.json', JSON.stringify({ recToken, candToken, assessmentId: id, questions }, null, 2));
console.log('context saved to _ctx.json');
