/**
 * Helpers compartilhados pelos scripts que lidam com o contrato OpenAPI do Core
 * (mesma ideia do `warren/Portal/Scripts/apiContract.ts`, adaptado pra Next):
 *  - `scripts/checkApiContract.ts` — compara o contrato no ar com o marcador
 *    antes de `dev`/`build`/`start` (hooks `pre*` no package.json).
 *
 * O marcador NÃO guarda o documento inteiro — só metadados + um hash estável,
 * o suficiente pra detectar "o contrato mudou desde o último `just map`".
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const SNAPSHOT_FILE = "./src/api/snapshot.json";

export interface ApiSnapshot {
  /** URL de onde o contrato foi puxado. */
  source: string;
  /** Versão do formato OpenAPI (ex.: "3.1.1"). */
  openapi: string;
  /** `info.version` do documento (ex.: "1.0.0"). */
  version: string;
  /** `sha256:<hex>` do documento canônico — a chave da comparação. */
  hash: string;
  /** ISO timestamp da última geração (`just map`). */
  pulledAt: string;
}

/** `{API_URL}/api/openapi/v1.json` — mesma resolução de env que o `orval.config.ts`. */
export function getOpenApiUrl(): string {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error("API_URL ausente — defina em web/.env (ver .env.example).");
  }
  return `${apiUrl.replace(/\/$/, "")}/api/openapi/v1.json`;
}

export async function fetchSpec(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** JSON canônico (chaves ordenadas recursivamente) — hash independe da ordem das chaves. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(",")}}`;
}

export function hashSpec(spec: unknown): string {
  return `sha256:${createHash("sha256").update(canonical(spec)).digest("hex")}`;
}

export function toSnapshot(url: string, spec: Record<string, unknown>): ApiSnapshot {
  const info = (spec.info ?? {}) as { version?: unknown };
  return {
    source: url,
    openapi: String(spec.openapi ?? "unknown"),
    version: String(info.version ?? "unknown"),
    hash: hashSpec(spec),
    pulledAt: new Date().toISOString(),
  };
}

export function readSnapshot(): ApiSnapshot | null {
  if (!existsSync(SNAPSHOT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8")) as ApiSnapshot;
  } catch {
    return null;
  }
}

export function writeSnapshot(snapshot: ApiSnapshot): void {
  writeFileSync(SNAPSHOT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
}
