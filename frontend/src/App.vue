<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
        <span>JobTracker</span>
      </div>
      <nav>
        <router-link to="/" class="nav-link" active-class="active" exact>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Dashboard
        </router-link>
        <router-link to="/add" class="nav-link" active-class="active">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Add Application
        </router-link>
      </nav>
      <button class="theme-toggle" @click="toggleTheme">
        <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
        {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
      </button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const theme = ref(localStorage.getItem('theme') || 'dark');

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  applyTheme(theme.value);
}

onMounted(() => applyTheme(theme.value));
</script>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 220px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  overflow-y: auto;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  padding: 0 8px;
}

.brand svg { color: var(--primary); }

nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--muted);
  font-weight: 500;
  transition: all 0.15s;
  position: relative;
}

.nav-link:hover {
  color: var(--text);
  background: var(--surface2);
}

.nav-link.active {
  color: var(--primary);
  background: rgba(99, 102, 241, 0.12);
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  font-weight: 500;
  font-size: 14px;
  margin-top: auto;
}

.theme-toggle:hover {
  color: var(--text);
  border-color: var(--text);
}

.content {
  margin-left: 220px;
  flex: 1;
  padding: 32px;
  max-width: 1200px;
}
</style>
