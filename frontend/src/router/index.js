import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import ApplicationForm from '../views/ApplicationForm.vue';
import ApplicationDetail from '../views/ApplicationDetail.vue';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/add', component: ApplicationForm },
  { path: '/edit/:id', component: ApplicationForm },
  { path: '/application/:id', component: ApplicationDetail },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
