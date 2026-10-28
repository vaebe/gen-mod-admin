import { ApiError } from "../../errors";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ACCESS_TOKEN_SECONDS = 900;

function base64url(value: Uint8Array): string {
  return btoa(String.fromCharCode(...value))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) =>
    char.charCodeAt(0),
  );
}

async function signingKey(secret: string): Promise<CryptoKey> {
  if (!secret) {
    throw new Error("JWT_SECRET 未配置");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createAccessToken(secret: string, userId: string): Promise<string> {
  const header = base64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64url(
    encoder.encode(
      JSON.stringify({
        sub: userId,
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_SECONDS,
      }),
    ),
  );
  const body = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    encoder.encode(body),
  );
  return `${body}.${base64url(new Uint8Array(signature))}`;
}

export async function readAccessSubject(secret: string, token: string): Promise<string> {
  const key = await signingKey(secret);
  try {
    const [header, payload, signature, extra] = token.split(".");
    if (!header || !payload || !signature || extra) {
      throw new Error("invalid JWT");
    }
    const algorithm: unknown = JSON.parse(decoder.decode(decode(header)));
    if (!isRecord(algorithm) || algorithm.alg !== "HS256") {
      throw new Error("invalid JWT");
    }
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      decode(signature),
      encoder.encode(`${header}.${payload}`),
    );
    const claims: unknown = JSON.parse(decoder.decode(decode(payload)));
    if (
      !valid ||
      !isRecord(claims) ||
      typeof claims.sub !== "string" ||
      typeof claims.exp !== "number" ||
      claims.exp <= Date.now() / 1000
    ) {
      throw new Error("expired or invalid JWT");
    }
    return claims.sub;
  } catch {
    throw new ApiError(401, "登录凭证无效");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
