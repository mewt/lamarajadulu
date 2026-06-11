const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { extractCvMarkdown } = require('../services/cvParse');

const ALLOWED_CV_EXTENSIONS = ['.pdf', '.docx', '.rtf', '.md', '.markdown'];

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `cv_${req.params.id}_${Date.now()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_CV_EXTENSIONS.includes(ext)) return cb(null, true);
    cb(new Error('Only PDF, DOCX, RTF and MD files are supported'));
  },
});

router.get('/', (req, res) => {
  const applications = db.prepare('SELECT * FROM applications ORDER BY created_at DESC').all();
  applications.forEach((a) => delete a.cv_content);
  res.json(applications);
});

router.get('/:id', (req, res) => {
  const app = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  delete app.cv_content;

  const analysis = db
    .prepare('SELECT * FROM analyses WHERE application_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(req.params.id);

  if (analysis) {
    analysis.strengths = JSON.parse(analysis.strengths || '[]');
    analysis.gaps = JSON.parse(analysis.gaps || '[]');
    analysis.cv_improvements = JSON.parse(analysis.cv_improvements || '[]');
    analysis.interview_tips = JSON.parse(analysis.interview_tips || '[]');
  }

  res.json({ ...app, analysis: analysis || null });
});

router.post('/', (req, res) => {
  const { company, role, job_url, job_description, status, applied_date, notes } = req.body;
  if (!company || !role) return res.status(400).json({ error: 'Company and role are required' });

  const result = db
    .prepare(
      'INSERT INTO applications (company, role, job_url, job_description, status, applied_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(
      company,
      role,
      job_url || null,
      job_description || null,
      status || 'wishlist',
      applied_date || null,
      notes || null
    );

  const created = db.prepare('SELECT * FROM applications WHERE id = ?').get(result.lastInsertRowid);
  delete created.cv_content;
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Application not found' });

  const { company, role, job_url, job_description, status, applied_date, notes } = req.body;

  db.prepare(
    'UPDATE applications SET company=?, role=?, job_url=?, job_description=?, status=?, applied_date=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?'
  ).run(
    company ?? existing.company,
    role ?? existing.role,
    job_url !== undefined ? job_url : existing.job_url,
    job_description !== undefined ? job_description : existing.job_description,
    status ?? existing.status,
    applied_date !== undefined ? applied_date : existing.applied_date,
    notes !== undefined ? notes : existing.notes,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  delete updated.cv_content;
  res.json(updated);
});

router.post('/:id/cv', upload.single('cv'), async (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Application not found' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const content = (await extractCvMarkdown(req.file.path, ext)).trim();

    if (!content) {
      return res.status(400).json({ error: 'Could not extract text from the file. Try a different format.' });
    }

    db.prepare(
      'UPDATE applications SET cv_filename = ?, cv_content = ?, cv_uploaded_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).run(req.file.originalname, content, req.params.id);

    res.json({ message: 'CV uploaded successfully', filename: req.file.originalname });
  } catch (err) {
    console.error('CV upload error:', err);
    res.status(500).json({ error: 'Failed to process CV: ' + err.message });
  }
});

router.get('/:id/cv', (req, res) => {
  const app = db.prepare('SELECT cv_content FROM applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ content: app.cv_content || '' });
});

router.delete('/:id/cv', (req, res) => {
  const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  db.prepare('UPDATE applications SET cv_filename = NULL, cv_content = NULL, cv_uploaded_at = NULL WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM tailored_cvs WHERE application_id = ?').run(req.params.id);
  res.status(204).end();
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Application not found' });
  db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
