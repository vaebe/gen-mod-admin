interface Binding { fetch(request: Request): Promise<Response> }
export default {
  async fetch(request: Request, env: { API: Binding; ASSETS: Binding }) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      url.pathname = url.pathname.slice(4)
      return env.API.fetch(new Request(url.toString(), {
        method: request.method, headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
        redirect: request.redirect, ...{ duplex: 'half' },
      }))
    }
    return env.ASSETS.fetch(request)
  },
}
