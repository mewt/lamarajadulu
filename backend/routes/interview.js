const express = require('express');
const router = express.Router();
const db = require('../db');
const deepseek = require('../services/deepseek');
const { renderPdf } = require('../services/cvExport');

const QUESTIONS_SYSTEM_PROMPT = `You are a senior hiring manager preparing interview questions for a candidate.

Your primary source is the JOB DESCRIPTION below — every question must be anchored to a specific responsibility, requirement, or skill it lists. Use the candidate's CV only to decide HOW to ask each question: reference their relevant experience where it exists, or probe how they'd approach the requirement where the CV doesn't show it.

Generate exactly 5 realistic interview questions a recruiter or hiring manager would ask in an early-stage interview for THIS role, as a mix of:
- 1 opening question connecting the candidate's background and motivation to what this specific role and company are looking for (reference the job title/company/focus, not just "this role")
- 2-3 questions, each tied to a distinct key responsibility or required skill from the job description, asking the candidate to relate their CV experience to it
- 1-2 questions targeting requirements or tools from the job description that the candidate's CV doesn't clearly demonstrate, probing how they'd handle that gap

Do not write generic questions that could apply to any job — every question should make it obvious, from its wording, which role and responsibilities it's about.

Return ONLY a raw JSON array of exactly 5 question strings, in the order they should be asked. No commentary, no markdown fences, no numbering.`;

const FEEDBACK_SYSTEM_PROMPT = `You are a supportive but honest interview coach helping a candidate practice for a real job interview.

You'll be given the candidate's CV, the target job, an interview question, and the candidate's answer.

STRICT GROUNDING RULE for "improved_answer": it must use ONLY experience, employers, projects, skills, and metrics that already appear in the candidate's CV. Never invent new experience, companies, numbers, or skills. You may restructure the answer (e.g. using the STAR method - Situation, Task, Action, Result) and draw in relevant details from elsewhere in the CV that the candidate didn't mention, but every fact must be traceable to the CV.

Respond with ONLY raw JSON matching this schema:
{
  "feedback": "<2-4 sentence honest, constructive assessment of the candidate's answer - clarity, structure, and relevance to the question and job>",
  "improved_answer": "<a stronger example answer to this same question, grounded strictly in the candidate's real CV>"
}

No commentary, no markdown fences.`;

const SUMMARY_SYSTEM_PROMPT = `You are a senior interview coach reviewing a candidate's completed mock-interview practice session.

You'll be given the candidate's CV, the target job, and a transcript of practice questions, the candidate's answers, and the feedback already given for each one.

Write an overall wrap-up of this practice session: how ready the candidate seems for the real interview, recurring strengths across their answers, and recurring areas to improve. Be honest, specific, and encouraging. Base everything only on what's shown in the transcript and CV — don't invent details.

Respond with ONLY raw JSON matching this schema:
{
  "overall_assessment": "<3-5 sentence honest summary of how the candidate performed overall and how ready they seem for the real interview>",
  "strengths": ["<recurring strength observed across the answers>"],
  "areas_to_improve": ["<recurring area to improve, with a concrete tip for next time>"]
}

No commentary, no markdown fences.`;

function stripFences(text) {
  return text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
}

// DeepSeek occasionally (a) embeds raw newlines/tabs inside JSON string values instead
// of escaping them, or (b) stops generating right after the last string value without
// emitting the closing brackets. Repair both before giving up.
function safeJsonParse(text) {
  const escaped = text.replace(/"(?:[^"\\]|\\.)*"/g, (m) =>
    m.replace(/[\n\r\t]/g, (ch) => ({ '\n': '\\n', '\r': '\\r', '\t': '\\t' }[ch]))
  );

  const attempts = [text, escaped];

  for (const candidate of [text, escaped]) {
    const closers = [];
    let inString = false;
    let escapeNext = false;
    for (const ch of candidate) {
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\' && inString) { escapeNext = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{' || ch === '[') closers.push(ch === '{' ? '}' : ']');
      else if (ch === '}' || ch === ']') closers.pop();
    }
    if (closers.length || inString) {
      attempts.push(candidate + (inString ? '"' : '') + closers.reverse().join(''));
    }
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {}
  }
  throw new Error('AI returned malformed JSON');
}

function buildContext(app) {
  const analysis = db
    .prepare('SELECT gaps FROM analyses WHERE application_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(app.id);

  let extra = '';
  if (analysis?.gaps) {
    const gaps = JSON.parse(analysis.gaps || '[]');
    if (gaps.length) {
      extra = `\n\nKNOWN GAPS (from a prior fit analysis of this CV against this job):\n${gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;
    }
  }

  return `CANDIDATE'S CV:\n\n${app.cv_content}\n\n---\n\nTARGET JOB: ${app.company} — ${app.role}\n\nJOB DESCRIPTION:\n${app.job_description}${extra}`;
}

function sanitizeFilename(s) {
  return (s || 'Interview').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'Interview';
}

function buildReportMarkdown(app, items, summary) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  let md = `# Interview Practice Report\n\n${app.role} — ${app.company}\n\n_${date}_\n\n`;

  if (summary) {
    md += `## Overall Assessment\n\n${summary.overall_assessment || ''}\n\n`;
    if (summary.strengths?.length) {
      md += `### Strengths\n\n${summary.strengths.map((s) => `- ${s}`).join('\n')}\n\n`;
    }
    if (summary.areas_to_improve?.length) {
      md += `### Areas to Improve\n\n${summary.areas_to_improve.map((s) => `- ${s}`).join('\n')}\n\n`;
    }
  }

  md += `## Practice Questions\n\n`;
  items.forEach((item, i) => {
    md += `### Question ${i + 1}\n\n**Q:** ${item.question}\n\n**Your Answer:**\n\n${item.answer}\n\n**Feedback:**\n\n${item.feedback}\n\n**Suggested Answer:**\n\n${item.improved_answer}\n\n`;
  });

  return md;
}

function loadApp(req, res) {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) {
    res.status(404).json({ error: 'Application not found' });
    return null;
  }
  if (!app.job_description) {
    res.status(400).json({ error: 'Add a job description to this application first' });
    return null;
  }
  if (!app.cv_content) {
    res.status(400).json({ error: 'Upload a CV for this application before practicing' });
    return null;
  }
  return app;
}

router.post('/:id/interview/questions', async (req, res) => {
  const app = loadApp(req, res);
  if (!app) return;

  try {
    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: QUESTIONS_SYSTEM_PROMPT },
        { role: 'user', content: buildContext(app) },
      ],
    });

    const questions = safeJsonParse(stripFences(response.choices[0].message.content));
    res.json({ questions });
  } catch (err) {
    console.error('Interview question generation error:', err);
    res.status(500).json({ error: 'Failed to generate interview questions: ' + err.message });
  }
});

router.post('/:id/interview/feedback', async (req, res) => {
  const app = loadApp(req, res);
  if (!app) return;

  const { question, answer } = req.body;
  if (!question || !answer || !answer.trim()) {
    return res.status(400).json({ error: 'An answer is required' });
  }

  try {
    const userPrompt = `${buildContext(app)}\n\n---\n\nINTERVIEW QUESTION: ${question}\n\nCANDIDATE'S ANSWER: ${answer}`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const data = safeJsonParse(stripFences(response.choices[0].message.content));
    res.json(data);
  } catch (err) {
    console.error('Interview feedback error:', err);
    res.status(500).json({ error: 'Failed to generate feedback: ' + err.message });
  }
});

router.post('/:id/interview/summary', async (req, res) => {
  const app = loadApp(req, res);
  if (!app) return;

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No practice session data provided' });
  }

  try {
    const transcript = items
      .map((item, i) => `Q${i + 1}: ${item.question}\nCandidate's answer: ${item.answer}\nFeedback given: ${item.feedback}`)
      .join('\n\n');

    const userPrompt = `${buildContext(app)}\n\n---\n\nPRACTICE SESSION TRANSCRIPT:\n\n${transcript}`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const data = safeJsonParse(stripFences(response.choices[0].message.content));
    res.json(data);
  } catch (err) {
    console.error('Interview summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary: ' + err.message });
  }
});

router.post('/:id/interview/report', async (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const { items, summary } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No practice session data provided' });
  }

  const markdown = buildReportMarkdown(app, items, summary);
  const format = req.query.format === 'pdf' ? 'pdf' : 'md';
  const baseName = `${sanitizeFilename(app.company)}-${sanitizeFilename(app.role)}-Interview-Practice`;

  try {
    if (format === 'pdf') {
      const pdf = await renderPdf(markdown, 'minimal');
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      res.send(pdf);
    } else {
      res.set('Content-Type', 'text/markdown');
      res.set('Content-Disposition', `attachment; filename="${baseName}.md"`);
      res.send(markdown);
    }
  } catch (err) {
    console.error('Interview report export error:', err);
    res.status(500).json({ error: 'Report export failed: ' + err.message });
  }
});

module.exports = router;
