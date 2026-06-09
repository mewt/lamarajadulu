<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Track your job applications</p>
      </div>
      <router-link to="/add" class="btn-primary" style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:var(--primary);color:#fff;border-radius:8px;font-weight:500;font-size:14px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Application
      </router-link>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ applications.length }}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#3b82f6">{{ countByStatus('applied') }}</div>
        <div class="stat-label">Applied</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#f59e0b">{{ countByStatus('interview') + countByStatus('phone_screen') }}</div>
        <div class="stat-label">Interviews</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#22c55e">{{ countByStatus('offer') }}</div>
        <div class="stat-label">Offers</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#ef4444">{{ countByStatus('rejected') }}</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input v-model="search" placeholder="Search company or role..." style="max-width:280px" />
      <select v-model="filterStatus" style="max-width:180px">
        <option value="">All statuses</option>
        <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </div>

    <!-- Applications list -->
    <div v-if="loading" class="empty-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="empty-state-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <p style="font-size:16px;font-weight:500;color:var(--text);margin-bottom:8px">No applications yet</p>
      <p style="font-size:13px">Add your first job application to get started</p>
    </div>

    <div v-else class="app-list">
      <div v-for="app in filtered" :key="app.id" class="app-row">
        <div class="app-main">
          <div class="app-info">
            <span class="company-name">{{ app.company }}</span>
            <span class="role-name">{{ app.role }}</span>
          </div>
          <div class="app-meta">
            <span :class="['status-badge', `status-${app.status}`]">{{ statusLabel(app.status) }}</span>
            <span v-if="app.applied_date" class="meta-date">Applied {{ formatDate(app.applied_date) }}</span>
          </div>
        </div>
        <div class="app-actions">
          <router-link :to="`/application/${app.id}`" class="btn-ghost btn-sm">View</router-link>
          <router-link :to="`/edit/${app.id}`" class="btn-ghost btn-sm">Edit</router-link>
          <button class="btn-danger btn-sm" @click="deleteApp(app.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';

const applications = ref([]);
const loading = ref(true);
const search = ref('');
const filterStatus = ref('');

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

const filtered = computed(() => {
  let list = applications.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(a => a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
  }
  if (filterStatus.value) list = list.filter(a => a.status === filterStatus.value);
  return list;
});

function countByStatus(s) {
  return applications.value.filter(a => a.status === s).length;
}

function statusLabel(s) {
  return statuses.find(x => x.value === s)?.label || s;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function deleteApp(id) {
  if (!confirm('Delete this application?')) return;
  await axios.delete(`/api/applications/${id}`);
  applications.value = applications.value.filter(a => a.id !== id);
}

onMounted(async () => {
  try {
    const { data } = await axios.get('/api/applications');
    applications.value = data;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  text-align: center;
}

.stat-value { font-size: 28px; font-weight: 700; }
.stat-label { font-size: 12px; color: var(--muted); margin-top: 4px; }

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.app-list { display: flex; flex-direction: column; gap: 10px; }

.app-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.15s;
}

.app-row:hover { border-color: var(--primary); }

.app-main { display: flex; align-items: center; gap: 20px; flex: 1; min-width: 0; }

.app-info { display: flex; flex-direction: column; min-width: 0; }
.company-name { font-weight: 600; font-size: 15px; }
.role-name { font-size: 13px; color: var(--muted); margin-top: 2px; }

.app-meta { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.meta-date { font-size: 12px; color: var(--muted); }

.app-actions { display: flex; gap: 8px; flex-shrink: 0; }

.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}
.status-wishlist    { background: rgba(100,116,139,.15); color: #94a3b8; }
.status-applied     { background: rgba(59,130,246,.15);  color: #60a5fa; }
.status-phone_screen { background: rgba(139,92,246,.15); color: #a78bfa; }
.status-interview   { background: rgba(245,158,11,.15);  color: #fbbf24; }
.status-technical_test { background: rgba(249,115,22,.15); color: #fb923c; }
.status-offer       { background: rgba(34,197,94,.15);   color: #4ade80; }
.status-rejected    { background: rgba(239,68,68,.15);   color: #f87171; }
.status-withdrawn   { background: rgba(107,114,128,.15); color: #9ca3af; }
</style>
