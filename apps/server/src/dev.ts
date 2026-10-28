import { Elysia } from 'elysia'

// 保留官方 Bun hello 对照；带 D1/R2 绑定的业务入口使用 Wrangler。
new Elysia().get('/', () => 'Hello Elysia').listen(3000)
