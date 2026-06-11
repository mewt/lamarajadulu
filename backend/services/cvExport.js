const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const TEMPLATES = ['modern', 'classic', 'minimal'];
const DEFAULT_TEMPLATE = 'modern';

function renderHtml(markdown, template) {
  const name = TEMPLATES.includes(template) ? template : DEFAULT_TEMPLATE;
  const shell = fs.readFileSync(path.join(__dirname, '../templates/cv', `${name}.html`), 'utf-8');
  const body = marked.parse(markdown);
  return shell.replace('{{CV_CONTENT}}', body);
}

async function renderPdf(markdown, template) {
  const html = renderHtml(markdown, template);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

module.exports = { renderHtml, renderPdf, TEMPLATES, DEFAULT_TEMPLATE };
