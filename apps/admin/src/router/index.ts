import { shallowRef } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { loadUser } from '../features/auth/session'
import { message } from '../lib/api'

export const navigationError = shallowRef('')

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../features/auth/HomePage.vue'), meta: { auth: true } },
    { path: '/login', component: () => import('../features/auth/LoginPage.vue') },
    { path: '/games', component: () => import('../features/games/GamesPage.vue'), meta: { auth: true, admin: true } },
    { path: '/skills', component: () => import('../features/skills/SkillsPage.vue'), meta: { auth: true, admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async to => {
  if (!to.meta.auth) { return true }
  try {
    const user = await loadUser()
    if (!user) { return '/login' }
    if (to.meta.admin && user.role !== 'admin') { return '/' }
    return true
  } catch (cause) { navigationError.value = message(cause); return false }
})

export default router;
