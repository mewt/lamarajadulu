const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const TurndownService = require('turndown');
const rtf2text = require('rtf2text');
const deepseek = require('./deepseek');

const turndown = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });

const REFORMAT_SYSTEM_PROMPT = `You convert raw CV/resume text (extracted from a document, with formatting lost or inconsistent) into clean, well-structured Markdown.

Rules:
- Preserve ALL factual content exactly as given: names, dates, employers, job titles, degrees, certifications, skills, numbers, and bullet point details. Do not add, remove, summarize, reword, or embellish anything.
- Only fix structure and formatting:
  - A single "# Full Name" as the top heading (use the candidate's name if present)
  - A line below with contact details (email, phone, location, links) as plain text
  - "## Section Name" headings for major sections (e.g. Summary, Experience, Education, Skills, Projects, Certifications)
  - "### Job Title — Company (Dates)" for entries within Experience/Education
  - "-" bullet list items for responsibilities, achievements, and skill lists
- If the input is already reasonably structured, keep its structure and just clean up formatting.
- Return ONLY the resulting Markdown. No commentary, no explanations, no code fences.`;

function stripFences(text) {
  return text.trim().replace(/^```(?:markdown|md)?\n?/, '').replace(/\n?```$/, '');
}

async function reformatToMarkdown(rawText) {
  const response = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: REFORMAT_SYSTEM_PROMPT },
      { role: 'user', content: rawText },
    ],
  });
  return stripFences(response.choices[0].message.content);
}

function rtfToText(filePath) {
  return new Promise((resolve, reject) => {
    rtf2text.string(fs.readFileSync(filePath, 'utf-8'), (err, text) => {
      if (err) reject(err);
      else resolve(text);
    });
  });
}

async function extractCvMarkdown(filePath, ext) {
  switch (ext) {
    case '.pdf': {
      const data = await pdfParse(fs.readFileSync(filePath));
      return reformatToMarkdown(data.text);
    }
    case '.docx': {
      const { value: html } = await mammoth.convertToHtml({ path: filePath });
      return reformatToMarkdown(turndown.turndown(html));
    }
    case '.rtf': {
      const text = await rtfToText(filePath);
      return reformatToMarkdown(text);
    }
    case '.md':
    case '.markdown':
      return fs.readFileSync(filePath, 'utf-8');
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

module.exports = { extractCvMarkdown };
