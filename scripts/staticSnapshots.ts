/**
 * Extrai os snapshots de rotas estáticas do OpenAPI para arquivos `.ts` e grava
 * o marcador `src/api/snapshot.json` (ver `scripts/apiContract.ts`). Mesma
 * ideia do `warren/Portal/Scripts/staticSnapshots.ts`, adaptado pra Next/tsx.
 *
 * O Core marca rotas de lookup de enum com `[StaticEndpoint(typeof(XxxClass))]`
 * (`Core.Plugins.OpenApi`), e o `StaticEndpointTransformer` embute a lista
 * projetada (`EnumOptionDTO`: `value` + `name` por idioma) como `x-snapshot` na
 * operação — os dados só mudam em restart da API.
 *
 * O Orval não extrai extensões `x-*`, então este passo roda depois do `orval`
 * (ver `justfile` → `map`): baixa o mesmo documento OpenAPI que o Orval usa,
 * grava um arquivo por rota com `x-snapshot` em `src/api/generated/static/`,
 * remove órfãos, e registra o marcador do contrato.
 *
 * Rodar: `npx tsx ./scripts/staticSnapshots.ts` (Core precisa estar no ar).
 */
import { readdirSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getOpenApiUrl, fetchSpec, toSnapshot, writeSnapshot } from "./apiContract";

const OUT_DIR = "./src/api/generated/static";

type EnumOption = { value: number; name: Record<string, string> };
type Operation = { "x-snapshot"?: EnumOption[] };

/** `/api/operation/statuses` + `get` → `getApiOperationStatuses` (mesmo esquema de nome do Orval sem operationId). */
function operationName(method: string, path: string): string {
  const parts = path
    .replace(/^\//, "")
    .split("/")
    .map((seg) => seg.replace(/[{}]/g, ""))
    .filter(Boolean);
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return method.toLowerCase() + pascal;
}

async function main() {
  const url = getOpenApiUrl();
  const spec = await fetchSpec(url);
  const paths = (spec.paths ?? {}) as Record<string, Record<string, Operation>>;

  mkdirSync(OUT_DIR, { recursive: true });

  const written = new Set<string>();

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, op] of Object.entries(methods)) {
      const snapshot = op["x-snapshot"];
      if (!snapshot) continue;

      const name = operationName(method, path);
      const file = `${name}.ts`;
      written.add(file);

      const body =
        `// AUTO-GERADO por scripts/staticSnapshots.ts — x-snapshot de ${method.toUpperCase()} ${path}\n` +
        `// Rota estática (dados só mudam em restart da API). NÃO editar à mão.\n` +
        `import type { EnumOptionDTO } from "../model";\n\n` +
        `export const ${name}: EnumOptionDTO[] = ${JSON.stringify(snapshot, null, 2)};\n`;

      writeFileSync(join(OUT_DIR, file), body, "utf-8");
      console.log(`  ✓ ${file} (${snapshot.length} opções)`);
    }
  }

  // Remove órfãos (rota deixou de ser estática ou saiu do contrato).
  if (existsSync(OUT_DIR)) {
    for (const f of readdirSync(OUT_DIR)) {
      if (f.endsWith(".ts") && f !== "index.ts" && !written.has(f)) {
        rmSync(join(OUT_DIR, f));
        console.log(`  ✗ ${f} (órfão removido)`);
      }
    }
  }

  // Barrel.
  const index =
    `// AUTO-GERADO por scripts/staticSnapshots.ts. NÃO editar à mão.\n` +
    [...written]
      .sort()
      .map((f) => `export * from "./${f.replace(/\.ts$/, "")}";`)
      .join("\n") +
    "\n";
  writeFileSync(join(OUT_DIR, "index.ts"), index, "utf-8");

  // Marcador do contrato (usado pelo check pré-dev/build).
  const snap = toSnapshot(url, spec);
  writeSnapshot(snap);

  console.log(`\n${written.size} snapshot(s) em ${OUT_DIR}`);
  console.log(`marcador: src/api/snapshot.json (${snap.version}, ${snap.hash.slice(0, 19)}…)`);
}

main();
