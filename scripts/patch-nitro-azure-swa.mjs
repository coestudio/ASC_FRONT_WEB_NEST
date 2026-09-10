// Azure-only build step, run after `vite build` (see package.json build:azure).
// Fixes four issues in nitro's azure-swa preset (3.0.260603-beta / 3.0.260610-beta,
// the latest available at the time of writing):
//
// 1. The generated Azure Functions handler does `new Request(url, ...)` where
//    `url` is a bare pathname (e.g. "/sobre"), which throws "Invalid URL" — the
//    Fetch API Request constructor requires an absolute URL.
//
// 2. The same handler sets `context.res.body = response.body`, the raw
//    ReadableStream from the SSR fetch Response, instead of reading it. The
//    Azure Functions Node.js worker can't serialize a stream across its RPC
//    channel to the host, so it silently serializes it as "{}" — every page
//    renders as a 2-byte empty body in production despite working in a direct
//    in-process call (which is why this didn't show up testing the handler
//    locally). Needs to be drained to text before being handed to context.res.
//
// 3. The same `new Request(...)` call never forwards the incoming request's
//    headers at all — no Content-Type, no Cookie, nothing. Harmless for a
//    plain GET page load, but fatal for POST server function calls: the
//    framework can't tell the body is JSON, can't read the session cookie,
//    and the RPC payload parsing blows up. That crash gets swallowed into a
//    generic 500 (see src/server.ts's normalizeCatastrophicSsrResponse),
//    which is why serverFns failed even after the routing (#/_serverFn/*)
//    and Request-URL fixes above got the request as far as this handler.
//
// 4. The preset unconditionally (re)writes staticwebapp.config.json at the repo
//    root as a build side effect (but only there — it never places a copy in
//    .output/public itself), discarding any prior content. So hand-authored
//    customizations (asset exclude patterns, mimeTypes) can't live in that
//    tracked file; it's gitignored and treated as pure build output. This
//    script copies nitro's generated root config into .output/public (which is
//    what actually gets deployed) and re-applies our customizations on top.
import { readFile, writeFile } from "node:fs/promises";

const functionsIndex = new URL("../.output/server/functions/index.mjs", import.meta.url);
const fixes = [
  {
    name: "Request URL bug",
    original: "new Request(url, {",
    patched: 'new Request(new URL(url, "http://localhost"), {',
  },
  {
    name: "streamed response body bug",
    original: "body: response.body,",
    patched: "body: await response.text(),",
  },
  {
    name: "missing request headers bug",
    original: "method: req.method || void 0,",
    patched: "method: req.method || void 0,\n\t\theaders: req.headers,",
  },
];

let handlerSource = await readFile(functionsIndex, "utf8");
for (const fix of fixes) {
  if (!handlerSource.includes(fix.original)) {
    throw new Error(
      `azure-swa patch target for "${fix.name}" not found in .output/server/functions/index.mjs — ` +
        "nitro's generated handler may have changed; update scripts/patch-nitro-azure-swa.mjs",
    );
  }
  handlerSource = handlerSource.replaceAll(fix.original, fix.patched);
}
await writeFile(functionsIndex, handlerSource);
console.log(
  "patched azure-swa Request URL + streamed response body bugs in .output/server/functions/index.mjs",
);

const generatedRootConfig = new URL("../staticwebapp.config.json", import.meta.url);
const configFile = new URL("../.output/public/staticwebapp.config.json", import.meta.url);
const config = JSON.parse(await readFile(generatedRootConfig, "utf8"));

// SWA's navigationFallback only rewrites GET requests (it exists purely for SPA
// deep-link support). TanStack Start's server functions POST to /_serverFn/<hash>,
// which without an explicit route falls through to navigationFallback, gets
// skipped because the method isn't GET, and is then answered directly by the
// static file host with its own 405 — this is why serverFns 404/405 in prod
// while working fine against the Vite dev server. Explicit `routes` entries
// (unlike navigationFallback) apply to all HTTP methods, so route it directly.
config.routes ??= [];
config.routes.push({ route: "/_serverFn/*", rewrite: "/api/server" });

config.navigationFallback ??= {};
config.navigationFallback.exclude = [
  "/assets/*",
  "/*.{css,scss,sass,less}",
  "/*.js",
  "/*.ico",
  "/*.png",
  "/*.gif",
  "/*.jpeg",
  "/*.jpg",
  "/*.webp",
  "/*.svg",
];
config.mimeTypes = {
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

await writeFile(configFile, JSON.stringify(config, null, 2));
console.log("applied asset exclude/mimeTypes overrides to .output/public/staticwebapp.config.json");
