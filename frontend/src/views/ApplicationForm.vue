<template>
  <div style="max-width:700px">
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEdit ? 'Edit Application' : 'Add Application' }}</h1>
        <p class="page-subtitle">{{ isEdit ? 'Update the details below' : 'Track a new job opportunity' }}</p>
      </div>
      <router-link to="/" class="btn-ghost">Back</router-link>
    </div>

    <div v-if="error" class="error-msg">{{ error }}</div>

    <form @submit.prevent="submit" class="card">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
        <div class="form-group">
          <label class="form-label">Company *</label>
          <input v-model="form.company" placeholder="e.g. Google" required />
        </div>
        <div class="form-group">
          <label class="form-label">Role *</label>
          <input v-model="form.role" placeholder="e.g. Senior Frontend Engineer" required />
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
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
          placeholder="Paste the full job description here. This is used by AI to analyze your CV fit."
          rows="10"
          style="resize:vertical;line-height:1.6"
        ></textarea>
        <p class="form-hint">Paste the complete job posting for the best AI analysis results.</p>
      </div>

      <div class="form-group">
        <label class="form-label">Personal Notes</label>
        <textarea v-model="form.notes" placeholder="Referral contacts, interview notes, salary info..." rows="3" style="resize:vertical"></textarea>
      </div>

      <div style="display:flex;gap:12px;margin-top:8px">
        <button type="submit" class="btn-primary" :disabled="saving">
          <span v-if="saving" class="spinner" style="width:16px;height:16px"></span>
          {{ isEdit ? 'Save Changes' : 'Add Application' }}
        </button>
        <router-link to="/" class="btn-ghost">Cancel</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => !!route.params.id);
const saving = ref(false);
const error = ref('');

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

const form = ref({
  company: '',
  role: '',
  status: 'wishlist',
  applied_date: '',
  job_url: '',
  job_description: '',
  notes: '',
});

onMounted(async () => {
  if (isEdit.value) {
    const { data } = await axios.get(`/api/applications/${route.params.id}`);
    form.value = {
      company: data.company || '',
      role: data.role || '',
      status: data.status || 'wishlist',
      applied_date: data.applied_date || '',
      job_url: data.job_url || '',
      job_description: data.job_description || '',
      notes: data.notes || '',
    };
  }
});

async function submit() {
  saving.value = true;
  error.value = '';
  try {
    if (isEdit.value) {
      await axios.put(`/api/applications/${route.params.id}`, form.value);
    } else {
      const { data } = await axios.post('/api/applications', form.value);
      router.push(`/application/${data.id}`);
      return;
    }
    router.push('/');
  } catch (e) {
    error.value = e.response?.data?.error || 'Something went wrong';
  } finally {
    saving.value = false;
  }
}
</script>
