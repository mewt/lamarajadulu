# JobTracker

An AI-assisted job application tracker. Keep track of the roles you've applied to, get an AI fit-analysis against each job description, tailor your CV for a specific role, and practice for the interview with an AI-generated Q&A session.

## Features

- **Application tracking** — add roles with company, job description, status, and notes; upload your CV (PDF, DOCX, RTF, or Markdown).
- **AI fit analysis** — match score, strengths, gaps, CV improvement suggestions, and interview tips generated from your CV + the job description.
- **CV tailoring** — AI rewrites your CV to better match a specific job, grounded strictly in your existing experience (no fabricated content). Export as Markdown or a styled PDF (modern / classic / minimal templates).
- **Interview Prep** — AI-generated practice questions aligned to the job description, with voice input/output, per-answer feedback and a suggested model answer, an end-of-session summary, and a downloadable practice report (Markdown or PDF).

## Tech stack

- **Backend**: Node.js, Express, better-sqlite3, Puppeteer (PDF export), DeepSeek API for AI features
- **Frontend**: Astro + Vue 3 (islands), axios

## Project structure

```
backend/    Express API + SQLite database
frontend/   Astro + Vue frontend
```

## Setup

### 1. Backend

```bash
cd backend
npm install
cp ../.env.example .env   # then fill in DEEPSEEK_API_KEY
npm run dev                # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:4321
```

## Environment variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DEEPSEEK_API_KEY` | API key for [DeepSeek](https://platform.deepseek.com) — powers AI analysis, CV tailoring, and interview prep |
| `PORT` | Backend port (default `3001`) |
| `FRONTEND_URL` | Frontend origin, for CORS (default `http://localhost:4321`) |

## License

Apache License 2.0 — see [LICENSE](LICENSE).
