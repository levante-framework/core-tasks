import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/test-insufficient-resources',
    component: () => import('../src/tests/pressure_test.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});


