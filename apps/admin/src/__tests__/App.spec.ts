import { afterEach, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { user } from '../features/auth/session'
afterEach(() => { user.value = null })
it('shows management navigation only for administrators', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div>home</div>' } }] })
  await router.push('/'); await router.isReady()
  user.value = { email: 'a@b.c', role: 'user' }
  const app = mount(App, { global: { plugins: [router] } })
  expect(app.text()).not.toContain('游戏管理')
  user.value = { email: 'admin@b.c', role: 'admin' }; await app.vm.$nextTick()
  expect(app.text()).toContain('游戏管理')
  expect(app.text()).toContain('官方 Skill')
})
