<template>
  <div v-if="loading" class="empty-state"><div class="spinner"></div></div>
  <div v-else-if="!app" class="empty-state">Application not found.</div>

  <div v-else>
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ app.company }}</h1>
        <p class="page-subtitle">{{ app.role }}</p>
      </div>
      <div style="display:flex;gap:10px">
        <router-link to="/" class="btn-ghost">Back</router-link>
        <router-link :to="`/edit/${app.id}`" class="btn-ghost">Edit</router-link>
      </div>
    </div>

    <!-- Info row -->
    <div class="info-row card" style="margin-bottom:24px">
      <div class="info-item">
        <span class="info-label">Status</span>
        <select :value="app.status" @change="updateStatus($event.target.value)" class="status-select">
          <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </div>
      <div class="info-item" v-if="app.applied_date">
        <span class="info-label">Applied</span>
        <span class="info-value">{{ formatDate(app.applied_date) }}</span>
      </div>
      <div class="info-item" v-if="app.job_url">
        <span class="info-label">Job Posting</span>
        <a :href="app.job_url" target="_blank" class="link">View posting</a>
      </div>
    </div>

    <div class="two-col">
      <!-- Left: Analysis -->
      <div>
        <!-- CV for this application -->
        <div class="card cv-card">
          <div class="cv-card-header">
            <h3 class="analysis-heading" style="margin-bottom:0">CV for this Application</h3>
            <span v-if="app.cv_filename" class="cv-status">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
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
            class="cv-upload-zone"
            :class="{ dragging: cvDragging }"
            @dragover.prevent="cvDragging = true"
            @dragleave="cvDragging = false"
            @drop.prevent="onCvDrop"
            @click="$refs.cvInput.click()"
          >
            <div v-if="!cvUploading">
              <p style="font-weight:500;margin-bottom:4px">Upload a CV for this application</p>
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

        <div class="section-header">
          <h2 class="section-title">AI Analysis</h2>
          <button @click="analyze" class="btn-primary btn-sm" :disabled="analyzing">
            <span v-if="analyzing" class="spinner" style="width:14px;height:14px"></span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            {{ analysis ? 'Re-analyze' : 'Analyze with AI' }}
          </button>
        </div>

        <div v-if="analyzeError" class="error-msg">{{ analyzeError }}</div>

        <div v-if="!app.job_description && !analysis" class="card" style="text-align:center;color:var(--muted);padding:32px">
          <p>Add a job description to enable AI analysis.</p>
          <router-link :to="`/edit/${app.id}`" class="btn-ghost btn-sm" style="margin-top:12px;display:inline-flex">Edit Application</router-link>
        </div>

        <div v-else-if="!analysis && !analyzing" class="card" style="text-align:center;color:var(--muted);padding:32px">
          <p>Click "Analyze with AI" to get CV match feedback and company insights.</p>
        </div>

        <!-- Analysis results -->
        <div v-if="analysis" class="analysis-wrap">
          <!-- Score -->
          <div class="score-card card">
            <div class="score-circle" :style="{ '--pct': analysis.match_score }">
              <span class="score-num">{{ analysis.match_score }}</span>
              <span class="score-pct">%</span>
            </div>
            <div class="score-info">
              <div class="score-label">CV Match Score</div>
              <div :class="['score-grade', scoreGrade(analysis.match_score).cls]">
                {{ scoreGrade(analysis.match_score).label }}
              </div>
              <p class="verdict-text">{{ analysis.verdict }}</p>
            </div>
          </div>

          <!-- Company overview -->
          <div class="card analysis-section" v-if="analysis.company_overview">
            <h3 class="analysis-heading">About the Role</h3>
            <p style="color:var(--muted);line-height:1.7">{{ analysis.company_overview }}</p>
          </div>

          <!-- Strengths -->
          <div class="card analysis-section" v-if="analysis.strengths?.length">
            <h3 class="analysis-heading" style="color:#4ade80">What You Have</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.strengths" :key="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><polyline points="20 6 9 17 4 12"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Gaps -->
          <div class="card analysis-section" v-if="analysis.gaps?.length">
            <h3 class="analysis-heading" style="color:#f87171">Gaps to Address</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.gaps" :key="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" style="flex-shrink:0;margin-top:2px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- CV improvements -->
          <div class="card analysis-section" v-if="analysis.cv_improvements?.length">
            <h3 class="analysis-heading" style="color:#fbbf24">Improve Your CV</h3>
            <ul class="analysis-list">
              <li v-for="(item, i) in analysis.cv_improvements" :key="item">
                <span class="tip-num">{{ i + 1 }}</span>
                {{ item }}
              </li>
            </ul>
          </div>

          <!-- Interview tips -->
          <div class="card analysis-section" v-if="analysis.interview_tips?.length">
            <h3 class="analysis-heading" style="color:#a78bfa">Interview Preparation</h3>
            <ul class="analysis-list">
              <li v-for="item in analysis.interview_tips" :key="item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" style="flex-shrink:0;margin-top:2px"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Right: Job description & notes -->
      <div>
        <div class="card" style="margin-bottom:16px" v-if="app.notes">
          <h3 class="analysis-heading">My Notes</h3>
          <p style="color:var(--muted);white-space:pre-wrap;line-height:1.7">{{ app.notes }}</p>
        </div>

        <div class="card" v-if="app.job_description">
          <h3 class="analysis-heading">Job Description</h3>
          <pre class="jd-text">{{ app.job_description }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const app = ref(null);
const analysis = ref(null);
const loading = ref(true);
const analyzing = ref(false);
const analyzeError = ref('');

const cvUploading = ref(false);
const cvDragging = ref(false);
const cvError = ref('');

const statuses = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'technical_test', label: 'Technical Test' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function scoreGrade(score) {
  if (score >= 80) return { label: 'Strong Match', cls: 'grade-strong' };
  if (score >= 60) return { label: 'Good Match', cls: 'grade-good' };
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

function onCvFileChange(e) {
  uploadCv(e.target.files[0]);
  e.target.value = '';
}

function onCvDrop(e) {
  cvDragging.value = false;
  uploadCv(e.dataTransfer.files[0]);
}

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
    const { data } = await axios.get(`/api/applications/${route.params.id}`);
    app.value = data;
    analysis.value = data.analysis;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.two-col {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  align-items: start;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 32px;
}

.info-item { display: flex; align-items: center; gap: 10px; }
.info-label { font-size: 12px; color: var(--muted); font-weight: 500; }
.info-value { font-size: 14px; }
.link { color: var(--primary); font-size: 14px; }
.link:hover { text-decoration: underline; }

.status-select {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 13px;
  width: auto;
  cursor: pointer;
}

.cv-card { margin-bottom: 16px; }

.cv-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.cv-status {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #4ade80;
  font-weight: 500;
}

.cv-current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.cv-info { min-width: 0; }
.cv-name { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cv-date { font-size: 12px; color: var(--muted); margin-top: 3px; }

.cv-upload-zone {
  text-align: center;
  padding: 28px 20px;
  border: 2px dashed var(--border);
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.15s;
}

.cv-upload-zone:hover, .cv-upload-zone.dragging {
  border-color: var(--primary);
  background: rgba(99,102,241,.05);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title { font-size: 16px; font-weight: 600; }
.analysis-wrap { display: flex; flex-direction: column; gap: 14px; }

.score-card {
  display: flex;
  align-items: center;
  gap: 24px;
}

.score-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: conic-gradient(var(--primary) calc(var(--pct) * 1%), var(--border) 0);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.score-circle::after {
  content: '';
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: var(--surface);
}

.score-num, .score-pct {
  position: relative;
  z-index: 1;
  font-weight: 700;
}
.score-num { font-size: 22px; }
.score-pct { font-size: 13px; color: var(--muted); }

.score-label { font-size: 12px; color: var(--muted); margin-bottom: 4px; }

.score-grade { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
.grade-strong { color: #4ade80; }
.grade-good   { color: #60a5fa; }
.grade-partial{ color: #fbbf24; }
.grade-weak   { color: #f87171; }

.verdict-text { font-size: 13px; color: var(--muted); line-height: 1.6; }

.analysis-section { }
.analysis-heading { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }

.analysis-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
}

.tip-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(245,158,11,.2);
  color: #fbbf24;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

.jd-text {
  font-family: inherit;
  font-size: 12px;
  color: var(--muted);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  line-height: 1.6;
}
</style>
