const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'jobtracker.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`DROP TABLE IF EXISTS cv;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    job_url TEXT,
    job_description TEXT,
    status TEXT DEFAULT 'wishlist',
    applied_date TEXT,
    notes TEXT,
    cv_filename TEXT,
    cv_content TEXT,
    cv_uploaded_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    match_score INTEGER,
    company_overview TEXT,
    strengths TEXT,
    gaps TEXT,
    cv_improvements TEXT,
    interview_tips TEXT,
    verdict TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
  );
`);

const appColumns = db.prepare('PRAGMA table_info(applications)').all().map((c) => c.name);
for (const [name, type] of [['cv_filename', 'TEXT'], ['cv_content', 'TEXT'], ['cv_uploaded_at', 'DATETIME']]) {
  if (!appColumns.includes(name)) db.exec(`ALTER TABLE applications ADD COLUMN ${name} ${type}`);
}

module.exports = db;
