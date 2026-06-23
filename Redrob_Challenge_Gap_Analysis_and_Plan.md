# Redrob Hackathon — Gap Analysis & Structured Plan

**Project audited:** Lumina-Intelligent-Hiring (Red-Robe-Lumina)
**Challenge:** Intelligent Candidate Discovery & Ranking Challenge
**Prepared:** 2026-06-23

---

## 1. Headline Finding — Your project solves a different problem

Your repo (**Lumina-Intelligent-Hiring**) is a **full-stack AI hiring-assessment & proctoring platform**:

- React frontend (`src/`) + Node/Express/MongoDB backend (`backend/`) + Python FastAPI "AI engine" (`main.py`, `core/`).
- It parses resumes/JDs, **generates assessments/MCQs**, runs **proctoring/anti-cheat**, evaluates candidate answers, and shows leaderboards.
- Its intelligence is built on **live LLM API calls** (Groq cloud / Ollama over HTTP — see `core/llm_client.py`).

The hackathon asks for something almost entirely different: a **single, offline, CPU-only batch ranker** that reads `candidates.jsonl` (100K records) and emits a top-100 `submission.csv` in **<= 5 minutes with no network / no LLM calls**.

These overlap only in theme ("hiring AI"). **Almost none of the current code is usable for the submission**, and its core design (per-request cloud LLM calls) is *explicitly forbidden* by the rules. Treat this as a **fresh build**, not a patch.

---

## 2. What the Challenge Requires (distilled from the spec)

| # | Requirement | Source |
|---|---|---|
| R1 | `rank.py` reads `candidates.jsonl` -> writes top-100 `submission.csv` | submission_spec sec.2, metadata template |
| R2 | CSV: header + exactly 100 rows; cols `candidate_id,rank,score,reasoning`; ranks 1-100 unique; score non-increasing; ties broken by `candidate_id` ascending | spec sec.2-3, validate_submission.py |
| R3 | <= 5 min, <= 16 GB RAM, CPU-only, network OFF, <= 5 GB disk during ranking | spec sec.3 |
| R4 | Ranking must reflect JD *meaning*, not keywords; avoid keyword-stuffer traps | job_description (final note) |
| R5 | Avoid ~80 honeypots (impossible profiles) — >10% in top 100 = disqualified | spec sec.7 |
| R6 | Weight 23 behavioral signals (response rate, last_active, etc.) as a modifier | redrob_signals_doc |
| R7 | Per-candidate reasoning: specific, JD-connected, honest, non-templated, no hallucination | spec sec.3 (Stage 4) |
| R8 | Optimize for NDCG@10 (0.5), NDCG@50 (0.3), MAP (0.15), P@10 (0.05) | spec sec.4 |
| R9 | GitHub repo: README w/ single reproduce command, requirements.txt, pre-compute scripts, submission_metadata.yaml | spec sec.10.3 |
| R10 | Working hosted sandbox (HF Spaces / Streamlit / Colab / Docker / Binder) | spec sec.10.5 |
| R11 | submission_metadata.yaml filled (team, GitHub, sandbox, compute env, AI-tools declaration, methodology) | template |
| R12 | Honest git history showing real iteration (not one dump); defendable in interview | spec sec.5 (Stage 4-5) |

---

## 3. Gap Analysis — what's missing vs. what exists

| Needed | In your repo today? | Verdict |
|---|---|---|
| `rank.py` batch ranker (CPU/offline) | None | Missing — core deliverable |
| `candidates.jsonl` loader (stream 100K, low-mem) | None (current ingests PDF/text via API) | Missing |
| JD-vs-candidate scoring without LLM API (local embeddings/TF-IDF + rules) | Logic exists but depends on Groq/Ollama calls -> violates R3 | Rebuild required |
| Title/role gate (reject "Marketing Manager w/ AI keywords") | None | Missing — high value (NDCG@10) |
| Honeypot / impossible-profile detector | None | Missing — DQ risk |
| Behavioral-signal modifier (23 signals) | None | Missing |
| Reasoning generator (offline, fact-grounded) | Only LLM-based, non-grounded | Rebuild required |
| `submission.csv` writer + tie-break + validator pass | None | Missing |
| `requirements.txt` scoped to ranker | Exists but for FastAPI/web stack | Replace |
| `submission_metadata.yaml` | Not created | Missing (R11) |
| README with single reproduce command | 2-line README | Rewrite (R9) |
| Hosted sandbox | Has Vercel/Render web deploy, not a ranker sandbox | Missing (R10) |
| Local NDCG/MAP eval harness (self-validation) | None | Missing — needed since no leaderboard |
| Meaningful git history | Single "Initial commit" | Build via real iteration (R12) |

**Reusable from current repo:** essentially only *ideas* — the skill-normalization vocabulary and JD-skill-matching heuristics in `core/jd_parser.py` / `core/resume_parser.py` can inform feature design. The code itself can't be reused because it routes through cloud LLMs. Copy in `validate_submission.py` and run it on every output.

---

## 4. The 5 things that make or break the score

1. **JD meaning over keywords** — score role/title fit and real career evidence; a "Marketing Manager" with AI skills is a *trap*, not a match.
2. **Honeypots** — detect impossible profiles (tenure > company age, "expert" with 0 months used). >10% in top-100 = disqualified.
3. **Behavioral signals** — down-weight stale/unresponsive candidates (`last_active_date`, `recruiter_response_rate`, `open_to_work`).
4. **Grounded reasoning** — 1-2 sentences citing *real* facts from the profile, varied, honest about gaps (Stage-4 manual check; hallucinated skills are red flags).
5. **Reproducibility** — full 100K run <= 5 min, <= 16 GB, CPU-only, network off; pinned requirements.txt; single reproduce command.

---

## 5. Recommended Structure

Build the ranker as a **clean, self-contained project** (own folder/repo) rather than entangling it with the web app — the spec's Stage-3 Docker reproduction expects a minimal, dependency-pinned ranker, and your web stack (Mongo, React, FastAPI) would only get in the way. The existing platform can stay as a separate showcase.

```
redrob-ranker/
  rank.py                      # entry: --candidates ... --out ...   (R1, <=5min)
  ranker/
    load.py                    # stream jsonl, parse schema
    jd.py                      # JD profile / target requirements (hardcoded from JD)
    features.py                # skills, title-fit, exp, location, education
    embed.py                   # local TF-IDF / small sentence-transformer (offline)
    honeypot.py                # impossible-profile detection (R5)
    signals.py                 # 23 behavioral-signal modifier (R6)
    score.py                   # combine -> final score (R8-aware)
    reasoning.py               # fact-grounded template-free reasoning (R7)
  eval/local_ndcg.py           # silver-label self-eval (no leaderboard!)
  precompute.py                # optional: build embeddings/index offline
  requirements.txt             # pinned, minimal (R9)
  submission_metadata.yaml     # filled (R11)
  README.md                    # single reproduce command (R9)
  validate_submission.py       # copied from bundle
  sandbox/                     # HF Space / Streamlit app (R10)
```

---

## 6. Structured Phased Plan (~8-11 days solo)

**Phase 0 — Setup (1/2 day)**
- Create `redrob-ranker/` (new repo or subfolder).
- Copy in `candidate_schema.json`, `validate_submission.py`, `sample_candidates.json`, `submission_metadata_template.yaml`.
- Pin minimal deps (numpy, scikit-learn, optionally a small local sentence-transformers model cached on disk so ranking stays network-off).
- First commit (start real git history — R12).

**Phase 1 — Data & JD modeling (1 day)**
- Streaming loader for 100K records (validate against schema).
- Encode the JD into an explicit target: *required* (embeddings/retrieval/ranking, vector DB, strong Python, eval frameworks); *nice-to-have*; *negative* signals (title-chaser, services-only / TCS-Infosys-type career, pure-research, CV/speech-only, keyword stuffing). This is where R4 is won.

**Phase 2 — Feature & scoring engine (2-3 days)**
- Components: semantic JD<->(summary + career descriptions) similarity (local embeddings/TF-IDF), title/role fit gate, skills with endorsement/duration trust (anti keyword-stuffing), years-of-experience band (5-9 soft), location (Pune/Noida/Tier-1 + relocation), education.
- Combine into a base score; keep it interpretable (needed for reasoning + interview defense, R12).

**Phase 3 — Honeypots & behavioral signals (1-2 days)**
- Honeypot detector: tenure > company age, "expert" with 0 duration, signup/active date impossibilities, etc. -> force to bottom (R5).
- Behavioral modifier: down-weight stale `last_active_date`, low `recruiter_response_rate`, not `open_to_work`; mild up-weight for engagement (R6).

**Phase 4 — Reasoning + output (1 day)**
- Generate 1-2 sentence, fact-grounded reasoning per top-100 (cite real years/title/skills/signal values; acknowledge concerns; vary phrasing — R7). No LLM at runtime.
- Write CSV with tie-break by `candidate_id`; run `validate_submission.py` until clean (R2).

**Phase 5 — Local evaluation (1 day, critical — no leaderboard)**
- Build a silver-label set (hand-label a sample, or rule-derived tiers) and compute NDCG@10/50, MAP, P@10 locally; check honeypot rate in top-100; iterate (R8).

**Phase 6 — Performance hardening (1/2-1 day)**
- Ensure full 100K run is <= 5 min / <= 16 GB CPU-only, network off. Move embeddings to a `precompute.py` step (precompute may exceed 5 min; *ranking* must not).

**Phase 7 — Packaging & deliverables (1 day)**
- README with the exact single reproduce command; pinned requirements.txt; fill submission_metadata.yaml (R11).
- Stand up the hosted sandbox on a <=100-candidate sample (R10).
- Push to GitHub with clean, incremental commit history (R12). Run validator one last time, then submit.

---

## 7. Deliverables Checklist (don't miss any)

- [ ] `rank.py` (single command: `python rank.py --candidates ./candidates.jsonl --out ./submission.csv`)
- [ ] `submission.csv` passing `validate_submission.py` (header + exactly 100 rows, unique ranks 1-100, score non-increasing, ties by candidate_id asc)
- [ ] Local NDCG@10/50 + MAP + P@10 eval harness (no leaderboard exists — self-validate)
- [ ] `requirements.txt` (minimal, pinned) + README with reproduce command
- [ ] `submission_metadata.yaml` (team, GitHub, sandbox, compute env, AI-tools declaration, methodology)
- [ ] Hosted sandbox (HF Spaces / Streamlit / Colab / Docker / Binder) on a <=100-candidate sample
- [ ] GitHub repo with real incremental git history (Stage-4 checks for genuine iteration)

---

## 8. Scoring Formula (for reference)

```
Final composite = 0.50 x NDCG@10 + 0.30 x NDCG@50 + 0.15 x MAP + 0.05 x P@10
```
Tiebreaks between submissions: higher P@5, then higher P@10, then earlier timestamp.
Relevant = tier 3+. Honeypots are forced to tier 0 in the ground truth.
