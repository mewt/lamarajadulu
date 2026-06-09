<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? 'Edit Application' : 'Add Application' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Update the details below' : 'Track a new job opportunity' }}</p>
      </div>
      <a href="/" class="btn-ghost">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </a>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <div class="form-layout">
      <!-- Form -->
      <form @submit.prevent="submit" class="card form-card">
        <div class="field-row">
          <div class="form-group">
            <label class="form-label">Company <span class="required">*</span></label>
            <input v-model="form.company" placeholder="e.g. Google" required />
          </div>
          <div class="form-group">
            <label class="form-label">Role <span class="required">*</span></label>
            <input v-model="form.role" placeholder="e.g. Senior Frontend Engineer" required />
          </div>
        </div>

        <div class="field-row">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select v-model="form.status">
              <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Applied Date</label>
            <input type="date" v-model="form.applied_date" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Job Posting URL</label>
          <input v-model="form.job_url" placeholder="https://..." type="url" />
        </div>

        <div class="form-group">
          <label class="form-label">Job Description</label>
          <textarea
            v-model="form.job_description"
            placeholder="Paste the full job description here..."
            rows="10"
            style="resize:vertical;line-height:1.6"
          ></textarea>
          <p class="form-hint">Paste the complete job posting for the best AI analysis results.</p>
        </div>

        <div class="form-group">
          <label class="form-label">Personal Notes</label>
          <textarea v-model="form.notes" placeholder="Referral contacts, interview notes, salary info..." rows="3" style="resize:vertical"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner" style="width:15px;height:15px"></span>
            {{ isEdit ? 'Save Changes' : 'Add Application' }}
          </button>
          <a href="/" class="btn-ghost">Cancel</a>
        </div>
      </form>

      <!-- Tips panel -->
      <aside class="tips-panel">
        <div class="tips-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Tips for a great entry
        </div>

        <div class="tip-group">
          <div class="tip-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Paste the full job description
          </div>
          <p class="tip-body">The AI analysis works best when it has the complete job posting — requirements, responsibilities, and company overview.</p>
        </div>

        <div class="tip-group">
          <div class="tip-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Add the job URL early
          </div>
          <p class="tip-body">Save the posting link right away — listings often get removed after you apply, so this helps you reference them later.</p>
        </div>

        <div class="tip-group">
          <div class="tip-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Use notes for context
          </div>
          <p class="tip-body">Track referral names, recruiter contacts, salary ranges, or impressions from your research. You'll thank yourself during interviews.</p>
        </div>

        <div class="tip-group">
          <div class="tip-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            Upload your CV on the detail page
          </div>
          <p class="tip-body">After saving, open the application to upload a tailored CV. The AI will compare it against the job description for a fit score.</p>
        </div>

        <div class="status-guide">
          <div class="sg-title">Status guide</div>
          <div v-for="s in statuses" :key="s.value" class="sg-row">
            <span :class="['status-badge', 'status-' + s.value]">{{ s.label }}</span>
            <span class="sg-desc">{{ statusDesc[s.value] }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const props = defineProps({ id: String });
const isEdit = computed(() => !!props.id);
const saving = ref(false);
const error = ref('');

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

const statusDesc = {
  wishlist:       'Saved, not yet applied',
  applied:        'Application submitted',
  phone_screen:   'Initial recruiter call scheduled',
  interview:      'Interview stage reached',
  technical_test: 'Technical assessment in progress',
  offer:          'Offer received',
  rejected:       'Not moving forward',
  withdrawn:      'Withdrew application',
};

const form = ref({
  company: '', role: '', status: 'wishlist',
  applied_date: '', job_url: '', job_description: '', notes: '',
});

onMounted(async () => {
  if (isEdit.value) {
    const { data } = await axios.get(`/api/applications/${props.id}`);
    form.value = {
      company:         data.company || '',
      role:            data.role || '',
      status:          data.status || 'wishlist',
      applied_date:    data.applied_date || '',
      job_url:         data.job_url || '',
      job_description: data.job_description || '',
      notes:           data.notes || '',
    };
  }
});

async function submit() {
  saving.value = true;
  error.value = '';
  try {
    if (isEdit.value) {
      await axios.put(`/api/applications/${props.id}`, form.value);
      window.location.href = '/';
    } else {
      const { data } = await axios.post('/api/applications', form.value);
      window.location.href = `/application/${data.id}`;
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Something went wrong';
    saving.value = false;
  }
}
</script>

<style scoped>
.form-layout {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 24px;
  align-items: start;
}

.form-card { display: flex; flex-direction: column; gap: 18px; }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.required { color: var(--danger); }

.form-actions {
  display: flex;
  gap: 10px;
  padding-top: 4px;
}

/* Tips panel */
.tips-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: 24px;
}

.tips-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.tip-group { display: flex; flex-direction: column; gap: 5px; }

.tip-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text);
}
.tip-title svg { color: var(--success); flex-shrink: 0; }

.tip-body {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
  padding-left: 20px;
}

.status-guide {
  border-top: 1px solid var(--border);
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sg-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  margin-bottom: 4px;
}

.sg-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sg-desc {
  font-size: 11px;
  color: var(--muted);
}
</style>
