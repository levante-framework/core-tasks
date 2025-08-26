import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import TestPage from './pages/TestInsufficientResources.vue';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/test-insufficient-resources', component: TestPage },
    { path: '/:pathMatch(.*)*', redirect: '/test-insufficient-resources' },
  ],
});

createApp(App).use(router).mount('#app');


