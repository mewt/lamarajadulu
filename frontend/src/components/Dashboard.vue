<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-subtitle">Track your job applications</p>
      </div>
      <a href="/add" class="btn-primary">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Application
      </a>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </div>
        <div class="stat-num">{{ applications.length }}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card stat-applied">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </div>
        <div class="stat-num">{{ countByStatus('applied') }}</div>
        <div class="stat-label">Applied</div>
      </div>
      <div class="stat-card stat-interview">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="stat-num">{{ countByStatus('interview') + countByStatus('phone_screen') + countByStatus('technical_test') }}</div>
        <div class="stat-label">Interviews</div>
      </div>
      <div class="stat-card stat-offer">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="stat-num">{{ countByStatus('offer') }}</div>
        <div class="stat-label">Offers</div>
      </div>
      <div class="stat-card stat-rejected">
        <div class="stat-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div class="stat-num">{{ countByStatus('rejected') }}</div>
        <div class="stat-label">Rejected</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="search-wrap">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" placeholder="Search company or role..." class="search-input" />
      </div>
      <div class="filter-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          :class="['tab', { active: activeTab === tab.value }]"
          @click="activeTab = tab.value"
          type="button"
        >{{ tab.label }}</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="empty-state">
      <div class="spinner"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      </div>
      <p class="empty-title">{{ search || activeTab !== 'all' ? 'No matches found' : 'No applications yet' }}</p>
      <p class="empty-sub">{{ search || activeTab !== 'all' ? 'Try adjusting your filters' : 'Add your first job application to get started' }}</p>
      <a v-if="!search && activeTab === 'all'" href="/add" class="btn-primary" style="margin-top:8px">Add Application</a>
    </div>

    <!-- List -->
    <div v-else class="app-list">
      <div v-for="app in filtered" :key="app.id" class="app-row" @click="goto('/application/' + app.id)">
        <div class="app-avatar" :style="{ background: avatarBg(app.company) }">
          {{ initials(app.company) }}
        </div>
        <div class="app-info">
          <div class="company-name">{{ app.company }}</div>
          <div class="role-name">{{ app.role }}</div>
        </div>
        <div class="app-right">
          <span :class="['status-badge', 'status-' + app.status]">{{ statusLabel(app.status) }}</span>
          <span v-if="app.applied_date" class="meta-date">{{ formatDate(app.applied_date) }}</span>
        </div>
        <div class="app-actions" @click.stop>
          <a :href="'/application/' + app.id" class="btn-ghost btn-sm">View</a>
          <a :href="'/application/' + app.id + '/edit'" class="btn-ghost btn-sm">Edit</a>
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
const activeTab = ref('all');

const tabs = [
  { value: 'all',    label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'offer',  label: 'Offers' },
  { value: 'rejected', label: 'Rejected' },
];

const statuses = [
  { value: 'wishlist',      label: 'Wishlist' },
  { value: 'applied',       label: 'Applied' },
  { value: 'phone_screen',  label: 'Phone Screen' },
  { value: 'interview',     label: 'Interview' },
  { value: 'technical_test',label: 'Technical Test' },
  { value: 'offer',         label: 'Offer' },
  { value: 'rejected',      label: 'Rejected' },
  { value: 'withdrawn',     label: 'Withdrawn' },
];

const activeStatuses = ['wishlist','applied','phone_screen','interview','technical_test'];

const filtered = computed(() => {
  let list = applications.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(a => a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q));
  }
  if (activeTab.value === 'active')   list = list.filter(a => activeStatuses.includes(a.status));
  if (activeTab.value === 'offer')    list = list.filter(a => a.status === 'offer');
  if (activeTab.value === 'rejected') list = list.filter(a => a.status === 'rejected');
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

function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function avatarBg(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue},50%,30%)`;
}

function goto(path) {
  window.location.href = path;
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
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s, transform 0.15s;
}
.stat-card:hover { transform: translateY(-1px); }

.stat-icon {
  width: 34px; height: 34px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
}

.stat-total   .stat-icon { background: var(--primary-subtle); color: var(--primary); }
.stat-applied .stat-icon { background: var(--info-bg);        color: var(--info); }
.stat-interview .stat-icon { background: var(--warning-bg);   color: var(--warning); }
.stat-offer   .stat-icon { background: var(--success-bg);     color: var(--success); }
.stat-rejected .stat-icon { background: var(--danger-bg);     color: var(--danger); }

.stat-num   { font-size: 26px; font-weight: 700; line-height: 1; }
.stat-label { font-size: 11px; color: var(--muted); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

.filters {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.search-wrap {
  position: relative;
  flex: 1;
  max-width: 320px;
}
.search-icon {
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: var(--muted); pointer-events: none;
}
.search-input { padding-left: 34px; }

.filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 3px;
}

.tab {
  padding: 5px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.tab:hover { color: var(--text); }
.tab.active { background: var(--surface-3); color: var(--text); }

.app-list { display: flex; flex-direction: column; gap: 8px; }

.app-row {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.app-row:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary-subtle);
}

.app-avatar {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.app-info { flex: 1; min-width: 0; }
.company-name { font-weight: 600; font-size: 14px; }
.role-name    { font-size: 12px; color: var(--text-2); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.app-right {
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0;
}
.meta-date { font-size: 12px; color: var(--muted); }

.app-actions {
  display: flex; gap: 6px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.app-row:hover .app-actions { opacity: 1; }

.empty-icon { color: var(--muted); margin-bottom: 4px; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--text); }
.empty-sub   { font-size: 13px; }
</style>
