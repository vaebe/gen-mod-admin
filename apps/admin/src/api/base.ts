const baseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const unauthorizedEvent = "genmod:unauthorized";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function response(path: string, init: RequestInit = {}): Promise<Response> {
  const result = await fetch(`${baseUrl}${path}`, { ...init, credentials: "include" });
  if (!result.ok) {
    const body = await result.json().catch(() => null);
    if (result.status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event(unauthorizedEvent));
    }
    throw new ApiError(
      result.status,
      body?.error || body?.message || `请求失败（${result.status}）`,
    );
  }
  return result;
}

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const result = await response(path, init);
  return result.json();
}

export const request = {
  get<T>(path: string): Promise<T> {
    return send(path, "GET");
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return send(path, "POST", body);
  },
  patch<T>(path: string, body: unknown): Promise<T> {
    return send(path, "PATCH", body);
  },
  delete<T>(path: string): Promise<T> {
    return send(path, "DELETE");
  },
};

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
