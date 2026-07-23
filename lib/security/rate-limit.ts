import "server-only";

import { createHash } from "crypto";
import { NextResponse } from "next/server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitBucket>;

type RateLimitOptions = {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  identifier?: string | null;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const STORE_MAX_SIZE = 10_000;

const globalRateLimit = globalThis as typeof globalThis & {
  __stellaRateLimitStore?: RateLimitStore;
};

const store =
  globalRateLimit.__stellaRateLimitStore ||
  (globalRateLimit.__stellaRateLimitStore = new Map<string, RateLimitBucket>());

function obterIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const primeiro = forwarded?.split(",")[0]?.trim();

  return primeiro || request.headers.get("x-real-ip")?.trim() || "desconhecido";
}

function hashChave(partes: string[]) {
  return createHash("sha256")
    .update(partes.join("|"))
    .digest("hex");
}

function limparExpirados(agora: number) {
  if (store.size < STORE_MAX_SIZE) return;

  for (const [chave, bucket] of store) {
    if (bucket.resetAt <= agora) {
      store.delete(chave);
    }
  }

  if (store.size < STORE_MAX_SIZE) return;

  const excedente = store.size - STORE_MAX_SIZE + 1;
  let removidos = 0;

  for (const chave of store.keys()) {
    store.delete(chave);
    removidos += 1;
    if (removidos >= excedente) break;
  }
}

export function verificarRateLimit({
  request,
  scope,
  limit,
  windowMs,
  identifier,
}: RateLimitOptions): RateLimitResult {
  const agora = Date.now();
  limparExpirados(agora);

  const chave = hashChave([
    scope,
    obterIp(request),
    String(identifier || "").trim().toLowerCase(),
  ]);
  const atual = store.get(chave);
  const bucket =
    !atual || atual.resetAt <= agora
      ? { count: 0, resetAt: agora + windowMs }
      : atual;

  bucket.count += 1;
  store.set(chave, bucket);

  const allowed = bucket.count <= limit;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - agora) / 1000),
  );

  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    retryAfterSeconds,
  };
}

export function respostaRateLimit(result: RateLimitResult) {
  return NextResponse.json(
    {
      error: "Muitas tentativas. Aguarde um pouco e tente novamente.",
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
        "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
