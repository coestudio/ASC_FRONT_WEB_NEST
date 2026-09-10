import { createFileRoute } from "@tanstack/react-router";

import { readServerSession } from "@/lib/session.server";

/**
 * Proxy same-origin para o Core (BFF). Ver specs/auth-httponly-cookie-bff.md §6.
 *
 * O client (src/api/mutator.ts) bate em `/api/core` com o método HTTP real e o
 * caminho+query do Core no header `x-core-path`. Aqui: lê a sessão do cookie
 * httpOnly selado, anexa o Bearer server-side e repassa a resposta em stream.
 *
 * Rota de path fixo (não splat) — server routes com splat não rodam nesta
 * versão do @tanstack/react-start (ver spec §6).
 */

const API_URL = process.env.API_URL;
if (!API_URL) {
  throw new Error("API_URL ausente — base do Core para o proxy (ver .env.exemple).");
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "cookie",
  "content-length",
  "x-core-path",
  "transfer-encoding",
  "keep-alive",
]);

async function handler({ request }: { request: Request }): Promise<Response> {
  const corePath = request.headers.get("x-core-path");
  if (!corePath || !corePath.startsWith("/")) {
    return Response.json({ message: "x-core-path inválido." }, { status: 400 });
  }

  // CSRF: em métodos mutantes, exige mesma origem (SameSite=Lax já barra o
  // grosso; isto é a checagem equivalente ao createCsrfMiddleware dos server fns).
  if (MUTATING.has(request.method)) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    if (origin && new URL(origin).host !== url.host) {
      return Response.json({ message: "Origem não permitida." }, { status: 403 });
    }
  }

  const session = await readServerSession();
  if (!session) {
    return Response.json({ message: "Sessão expirada." }, { status: 401 });
  }

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("Authorization", `Bearer ${session.accessToken}`);

  let coreRes: Response;
  try {
    coreRes = await fetch(`${API_URL}${corePath}`, {
      method: request.method,
      headers,
      body: MUTATING.has(request.method) ? request.body : undefined,
      // @ts-expect-error - duplex é exigido pelo runtime para body em stream
      duplex: "half",
      redirect: "manual",
    });
  } catch {
    return Response.json(
      { message: "Erro ao se comunicar com o servidor. Tente novamente." },
      { status: 502 },
    );
  }

  // Core devolveu 401 → limpa o cookie na resposta.
  const outHeaders = new Headers();
  coreRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders.set(key, value);
  });
  if (coreRes.status === 401) {
    outHeaders.append("set-cookie", "asc_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  }

  return new Response(coreRes.body, {
    status: coreRes.status,
    statusText: coreRes.statusText,
    headers: outHeaders,
  });
}

export const Route = createFileRoute("/api/core")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      PATCH: handler,
      DELETE: handler,
    },
  },
});
