<template>
  <div v-if="loading" class="empty-state"><div class="spinner"></div></div>
  <div v-else-if="!app" class="empty-state">Application not found.</div>

  <div v-else>
    <div class="page-header">
      <div class="header-left">
        <div class="header-avatar" :style="{ background: avatarBg(app.company) }">
          {{ initials(app.company) }}
        </div>
        <div>
          <h1 class="page-title">{{ app.company }}</h1>
          <p class="page-subtitle">{{ app.role }}</p>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <span :class="['status-badge', 'status-' + app.status]" style="font-size:12px;padding:4px 12px">{{ statusLabel(app.status) }}</span>
        <a href="/" class="btn-ghost btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back
        </a>
        <a :href="'/application/' + app.id + '/edit'" class="btn-ghost btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </a>
      </div>
    </div>

    <!-- Meta bar -->
    <div class="meta-bar card" style="margin-bottom:24px">
      <div class="meta-item">
        <span class="meta-label">Status</span>
        <select :value="app.status" @change="updateStatus($event.target.value)" class="status-select">
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="meta-sep"></div>
      <div class="meta-item" v-if="app.applied_date">
        <span class="meta-label">Applied</span>
        <span class="meta-value">{{ formatDate(app.applied_date) }}</span>
      </div>
      <div class="meta-sep" v-if="app.applied_date && app.job_url"></div>
      <div class="meta-item" v-if="app.job_url">
        <span class="meta-label">Job Posting</span>
        <a :href="app.job_url" target="_blank" class="link" style="font-size:13px">
          View posting
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;margin-left:2px"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>
    </div>

    <div class="two-col">
      <!-- Left: CV + Analysis -->
      <div>
        <!-- CV upload -->
        <div class="card cv-card">
          <div class="cv-card-header">
            <h3 class="section-heading">CV for this Application</h3>
            <span v-if="app.cv_filename" class="cv-status">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Uploaded
            </span>
          </div>

          <div v-if="app.cv_filename" class="cv-current">
            <div class="cv-info">
              <div class="cv-name">{{ app.cv_filename }}</div>
              <div class="cv-date">Uploaded {{ formatDate(app.cv_uploaded_at) }}</div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0">
              <button class="btn-ghost btn-sm" type="button" @click="$refs.cvInput.click()">Replace</button>
              <button class="btn-danger btn-sm" type="button" @click="removeCv">Remove</button>
            </div>
          </div>

          <div
            v-else
            class="cv-drop"
            :class="{ dragging: cvDragging }"
            @dragover.prevent="cvDragging = true"
            @dragleave="cvDragging = false"
            @drop.prevent="onCvDrop"
            @click="$refs.cvInput.click()"
          >
            <div v-if="!cvUploading">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--muted);margin-bottom:10px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <p style="font-weight:600;font-size:13px;margin-bottom:3px">Upload a CV for this application</p>
              <p style="font-size:12px;color:var(--muted)">Drag & drop or click — PDF or DOCX, max 10MB</p>
            </div>
            <div v-else style="display:flex;flex-direction:column;align-items:center;gap:10px">
              <div class="spinner" style="width:24px;height:24px"></div>
              <p style="color:var(--muted);font-size:13px">Extracting text from CV...</p>
            </div>
          </div>

          <input ref="cvInput" type="file" accept=".pdf,.docx" style="display:none" @change="onCvFileChange" />
          <div v-if="cvError" class="error-msg" style="margin-top:12px;margin-bottom:0">{{ cvError }}</div>
        </div>

        <!-- Analysis header -->
        <div class="section-header">
          <h2 class="section-title">AI Analysis</h2>
          <button @click="analyze" class="btn-primary btn-sm" :disabled="analyzing">
            <span v-if="analyzing" class="spinner" style="width:13px;height:13px"></span>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            {{ analysis ? 'Re-analyze' : 'Analyze with AI' }}
          </button>
        </div>

        <div v-if="analyzeError" class="error-msg">{{ analyzeError }}</div>

        <div v-if="!app.job_description && !analysis" class="card" style="text-align:center;color:var(--muted);padding:40px 24px">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 12px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p style="font-size:14px;font-weight:500;margin-bottom:6px">No job description added</p>
          <p style="font-size:13px;margin-bottom:16px">Add a job description to enable AI analysis.</p>
          <a :href="'/application/' + app.id + '/edit'" class="btn-ghost btn-sm" style="display:inline-flex">Edit Application</a>
        </div>

        <div v-else-if="!analysis && !analyzing" class="card" style="text-align:center;color:var(--muted);padding:40px 24px">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin:0 auto 12px;color:var(--primary)"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <p style="font-size:14px;font-weight:500;margin-bottom:4px">Ready to analyze</p>
          <p style="font-size:13px">Click "Analyze with AI" to get CV match feedback and insights.</p>
        </div>

        <!-- Analysis results -->
        <div v-if="analysis" class="analysis-wrap">
          <div class="score-card card">
            <div class="score-circle" :style="{ '--pct': analysis.match_score }">
              <span class="score-num">{{ analysis.match_score }}</span>
              <span class="score-pct">%</span>
            </div>
            <div class="score-info">
              <div class="score-label">CV Match Score</div>
              <div :class="['score-grade', scoreGrade(analysis.match_score).cls]">{{ scoreGrade(analysis.match_score).label }}</div>
              <p class="verdict-text">{{ analysis.verdict }}</p>
            </div>
          </div>

          <div class="card analysis-section" v-if="analysis.company_overview">
            <h3 class="analysis-heading">About the Role</h3>
            <p style="color:var(--text-2);line-height:1.7;font-size:13px">{{ analysis.company_overview }}</p>
          </div>

          <div class="card analysis-section" v-if="analysis.strengths?.length">
            <h3 class="analysis-heading" style="color:var(--success)">What You Have</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.strengths" :key="item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><polyline points="20 6 9 17 4 12"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="card analysis-section" v-if="analysis.gaps?.length">
            <h3 class="analysis-heading" style="color:var(--danger)">Gaps to Address</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.gaps" :key="item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="card analysis-section" v-if="analysis.cv_improvements?.length">
            <h3 class="analysis-heading" style="color:var(--warning)">Improve Your CV</h3>
            <ul class="analysis-list">
              <li v-for="(item, i) in analysis.cv_improvements" :key="item">
                <span class="tip-num">{{ i + 1 }}</span>
                {{ item }}
              </li>
            </ul>
          </div>

          <div class="card analysis-section" v-if="analysis.interview_tips?.length">
            <h3 class="analysis-heading" style="color:#a78bfa">Interview Preparation</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.interview_tips" :key="item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="flex-shrink:0;margin-top:2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Right: Notes + JD -->
      <div>
        <div class="card" style="margin-bottom:14px" v-if="app.notes">
          <h3 class="section-heading" style="margin-bottom:10px">My Notes</h3>
          <p style="color:var(--text-2);white-space:pre-wrap;line-height:1.7;font-size:13px">{{ app.notes }}</p>
        </div>

        <div class="card" v-if="app.job_description">
          <h3 class="section-heading" style="margin-bottom:10px">Job Description</h3>
          <pre class="jd-text">{{ app.job_description }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({ id: String });
const app = ref(null);
const analysis = ref(null);
const loading = ref(true);
const analyzing = ref(false);
const analyzeError = ref('');
const cvUploading = ref(false);
const cvDragging = ref(false);
const cvError = ref('');

const statuses = [
  { value: 'wishlist',       label: 'Wishlist' },
  { value: 'applied',        label: 'Applied' },
  { value: 'phone_screen',   label: 'Phone Screen' },
  { value: 'interview',      label: 'Interview' },
  { value: 'technical_test', label: 'Technical Test' },
  { value: 'offer',          label: 'Offer' },
  { value: 'rejected',       label: 'Rejected' },
  { value: 'withdrawn',      label: 'Withdrawn' },
];

function statusLabel(s) {
  return statuses.find(x => x.value === s)?.label || s;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarBg(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360},50%,30%)`;
}

function scoreGrade(score) {
  if (score >= 80) return { label: 'Strong Match', cls: 'grade-strong' };
  if (score >= 60) return { label: 'Good Match',   cls: 'grade-good' };
  if (score >= 40) return { label: 'Partial Match', cls: 'grade-partial' };
  return { label: 'Weak Match', cls: 'grade-weak' };
}

async function updateStatus(status) {
  await axios.put(`/api/applications/${app.value.id}`, { status });
  app.value.status = status;
}

async function uploadCv(file) {
  if (!file) return;
  cvError.value = '';
  cvUploading.value = true;
  try {
    const form = new FormData();
    form.append('cv', file);
    const { data } = await axios.post(`/api/applications/${app.value.id}/cv`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    app.value.cv_filename = data.filename;
    app.value.cv_uploaded_at = new Date().toISOString();
  } catch (e) {
    cvError.value = e.response?.data?.error || 'Upload failed. Try again.';
  } finally {
    cvUploading.value = false;
  }
}

function onCvFileChange(e) { uploadCv(e.target.files[0]); e.target.value = ''; }
function onCvDrop(e) { cvDragging.value = false; uploadCv(e.dataTransfer.files[0]); }

async function removeCv() {
  if (!confirm('Remove the CV from this application?')) return;
  await axios.delete(`/api/applications/${app.value.id}/cv`);
  app.value.cv_filename = null;
  app.value.cv_uploaded_at = null;
}

async function analyze() {
  analyzing.value = true;
  analyzeError.value = '';
  try {
    const { data } = await axios.post(`/api/analyze/${app.value.id}`);
    analysis.value = data;
  } catch (e) {
    analyzeError.value = e.response?.data?.error || 'Analysis failed. Try again.';
  } finally {
    analyzing.value = false;
  }
}

onMounted(async () => {
  try {
    const { data } = await axios.get(`/api/applications/${props.id}`);
    app.value = data;
    analysis.value = data.analysis;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.header-left { display: flex; align-items: center; gap: 16px; }
.header-avatar {
  width: 52px; height: 52px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}

.meta-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 14px 20px;
}
.meta-item { display: flex; align-items: center; gap: 10px; padding: 0 20px; }
.meta-item:first-child { padding-left: 0; }
.meta-item:last-child  { padding-right: 0; }
.meta-label { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.meta-value { font-size: 13px; }
.meta-sep { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; }

.status-select {
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  font-size: 13px;
  width: auto;
  cursor: pointer;
  font-family: inherit;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 20px;
  align-items: start;
}

.cv-card { margin-bottom: 16px; }
.cv-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.cv-status { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #4ade80; font-weight: 500; }
.cv-current { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.cv-info { min-width: 0; }
.cv-name { font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-date { font-size: 12px; color: var(--muted); margin-top: 3px; }

.cv-drop {
  text-align: center;
  padding: 32px 20px;
  border: 2px dashed var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}
.cv-drop:hover, .cv-drop.dragging {
  border-color: var(--primary);
  background: var(--primary-subtle);
}

.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.section-title  { font-size: 15px; font-weight: 600; }
.section-heading { font-size: 13px; font-weight: 600; }

.analysis-wrap { display: flex; flex-direction: column; gap: 12px; }

.score-card { display: flex; align-items: center; gap: 24px; }
.score-circle {
  width: 88px; height: 88px;
  border-radius: 50%;
  background: conic-gradient(var(--primary) calc(var(--pct) * 1%), var(--border) 0);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; position: relative;
}
.score-circle::after {
  content: ''; position: absolute;
  width: 68px; height: 68px;
  border-radius: 50%;
  background: var(--surface);
}
.score-num, .score-pct { position: relative; z-index: 1; font-weight: 700; }
.score-num { font-size: 21px; }
.score-pct { font-size: 12px; color: var(--muted); }
.score-info { flex: 1; }
.score-label { font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
.score-grade { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.grade-strong { color: #4ade80; }
.grade-good   { color: #60a5fa; }
.grade-partial{ color: #fbbf24; }
.grade-weak   { color: #f87171; }
.verdict-text { font-size: 12px; color: var(--muted); line-height: 1.6; }

.analysis-section {}
.analysis-heading {
  font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.analysis-list {
  list-style: none; display: flex; flex-direction: column; gap: 8px;
}
.analysis-list li {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: var(--text-2); line-height: 1.5;
}
.tip-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 17px; height: 17px;
  border-radius: 50%;
  background: var(--warning-bg); color: var(--warning);
  font-size: 10px; font-weight: 700;
  flex-shrink: 0; margin-top: 1px;
}

.jd-text {
  font-family: inherit; font-size: 12px; color: var(--muted);
  white-space: pre-wrap; word-break: break-word;
  max-height: 400px; overflow-y: auto;
  line-height: 1.65;
}
</style>
