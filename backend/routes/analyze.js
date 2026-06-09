const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const db = require('../db');

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

router.post('/:applicationId', async (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.applicationId);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (!app.job_description) return res.status(400).json({ error: 'Add a job description to this application first' });
  if (!app.cv_content) return res.status(400).json({ error: 'Upload a CV for this application before analyzing' });

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior career coach and hiring expert with 15+ years of experience in tech recruiting. You give honest, specific, actionable feedback. Never be vague. Always cite specific evidence from the CV or job description.',
        },
        {
          role: 'user',
          content: `CANDIDATE CV:\n\n${app.cv_content}\n\n---\n\nJOB: ${app.company} — ${app.role}\n\nJOB DESCRIPTION:\n${app.job_description}\n\nRespond ONLY with a raw JSON object (no markdown fences, no explanation) matching this schema exactly:\n{\n  "match_score": <integer 0-100>,\n  "company_overview": "<2-3 sentences about the company and what this role involves>",\n  "strengths": ["<specific CV strength that matches a requirement>"],\n  "gaps": ["<specific missing skill or experience the job requires>"],\n  "cv_improvements": ["<concrete, actionable CV change to improve chances>"],\n  "interview_tips": ["<specific preparation tip for this company/role>"],\n  "verdict": "<honest 2-3 sentence overall assessment of chances and main advice>"\n}`,
        },
      ],
    });

    let data;
    try {
      const raw = response.choices[0].message.content.trim();
      // Strip markdown code fences if DeepSeek wraps the response
      const clean = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      data = JSON.parse(clean);
    } catch {
      return res.status(500).json({ error: 'AI returned malformed response. Try again.' });
    }

    db.prepare(
      'INSERT INTO analyses (application_id, match_score, company_overview, strengths, gaps, cv_improvements, interview_tips, verdict) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      app.id,
      data.match_score,
      data.company_overview,
      JSON.stringify(data.strengths || []),
      JSON.stringify(data.gaps || []),
      JSON.stringify(data.cv_improvements || []),
      JSON.stringify(data.interview_tips || []),
      data.verdict
    );

    res.json(data);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
});

module.exports = router;
