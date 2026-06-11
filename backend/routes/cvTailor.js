const express = require('express');
const router = express.Router();
const db = require('../db');
const deepseek = require('../services/deepseek');
const { renderPdf, TEMPLATES, DEFAULT_TEMPLATE } = require('../services/cvExport');

const SYSTEM_PROMPT = `You are an expert resume writer helping a candidate tailor their existing CV to a specific job posting.

STRICT GROUNDING RULES — follow exactly:
1. Use ONLY information that is already present in the candidate's CV below. Never invent, infer, or add an employer, job title, date, degree, certification, skill, tool, technology, metric, or achievement that isn't already there.
2. You MAY: reorder sections and bullet points to foreground what's most relevant to this job; rephrase wording for clarity and impact; mirror terminology from the job description ONLY where it truthfully describes experience the candidate already has; trim or de-emphasize less relevant content; tighten verbose bullets; fix grammar and formatting.
3. If the job description asks for something the CV doesn't show, do not fabricate it — simply don't claim it.
4. Preserve all factual specifics (company names, job titles, dates, degrees, certifications, numbers) exactly as given in the original.
5. Do NOT expand a general phrase into specific named sub-skills, tools, or techniques. For example, if the CV says "SEO strategies" or "SEO initiatives", do not turn that into separate line items like "Technical SEO (structured data, crawl errors)", "On-Page Optimization (meta tags, headings, internal linking)", or "Keyword Research & Search Intent Analysis" — those are fabricated specifics, even if they're plausible. Keep the original level of specificity, or make it more general — never more specific.
6. The Skills section may only contain items that already appear (in the same or very close wording) somewhere in the original CV — either in its own Skills section or as a tool/technology explicitly named in a job bullet. Do not create new skill line items by inferring from a duty description. Before finalizing, re-check every Skills line against the original CV and remove anything that doesn't pass this test.

FORMAT: Output ONLY the rewritten CV as Markdown using this structure:
- "# Full Name" as the single top heading
- A line below with contact details
- "## Section Name" headings (Summary, Experience, Education, Skills, etc.)
- "### Job Title — Company (Dates)" for entries within Experience/Education
- "-" bullet list items

No commentary, no explanations, no notes about what changed, no code fences.`;

function stripFences(text) {
  return text.trim().replace(/^```(?:markdown|md)?\n?/, '').replace(/\n?```$/, '');
}

function sanitizeFilename(s) {
  return (s || 'CV').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'CV';
}

router.post('/:id/cv/tailor', async (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  if (!app.job_description) return res.status(400).json({ error: 'Add a job description to this application first' });
  if (!app.cv_content) return res.status(400).json({ error: 'Upload a CV for this application before tailoring' });

  try {
    const analysis = db
      .prepare('SELECT cv_improvements FROM analyses WHERE application_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(req.params.id);

    let emphasis = '';
    if (analysis?.cv_improvements) {
      const improvements = JSON.parse(analysis.cv_improvements || '[]');
      if (improvements.length) {
        emphasis = `\n\nAREAS TO EMPHASIZE (from a prior fit analysis of this CV against this job):\n${improvements.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
      }
    }

    const userPrompt = `CANDIDATE'S CURRENT CV (Markdown):\n\n${app.cv_content}\n\n---\n\nTARGET JOB: ${app.company} — ${app.role}\n\nJOB DESCRIPTION:\n${app.job_description}${emphasis}\n\nRewrite the CV following the rules above so it best presents the candidate's existing experience for this job.`;

    const response = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const markdown = stripFences(response.choices[0].message.content);

    const result = db
      .prepare('INSERT INTO tailored_cvs (application_id, content_markdown) VALUES (?, ?)')
      .run(req.params.id, markdown);

    const row = db.prepare('SELECT id, content_markdown, created_at FROM tailored_cvs WHERE id = ?').get(result.lastInsertRowid);
    res.json(row);
  } catch (err) {
    console.error('CV tailoring error:', err);
    res.status(500).json({ error: 'CV tailoring failed: ' + err.message });
  }
});

router.get('/:id/cv/tailored', (req, res) => {
  const app = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const row = db
    .prepare('SELECT id, content_markdown, created_at FROM tailored_cvs WHERE application_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.params.id);

  res.json(row || null);
});

router.get('/:id/cv/tailored/:tid/download', async (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  const row = db
    .prepare('SELECT * FROM tailored_cvs WHERE id = ? AND application_id = ?')
    .get(req.params.tid, req.params.id);
  if (!row) return res.status(404).json({ error: 'Tailored CV not found' });

  const format = req.query.format === 'pdf' ? 'pdf' : 'md';
  const template = TEMPLATES.includes(req.query.template) ? req.query.template : DEFAULT_TEMPLATE;
  const baseName = `${sanitizeFilename(app.company)}-${sanitizeFilename(app.role)}-CV`;

  try {
    if (format === 'pdf') {
      const pdf = await renderPdf(row.content_markdown, template);
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
      res.send(pdf);
    } else {
      res.set('Content-Type', 'text/markdown');
      res.set('Content-Disposition', `attachment; filename="${baseName}.md"`);
      res.send(row.content_markdown);
    }
  } catch (err) {
    console.error('CV export error:', err);
    res.status(500).json({ error: 'CV export failed: ' + err.message });
  }
});

module.exports = router;
