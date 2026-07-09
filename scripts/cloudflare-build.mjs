import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

if (process.env.OPENNEXT_INNER_NEXT_BUILD === "1") {
  const result = spawnSync("next", ["build"], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, OPENNEXT_INNER_NEXT_BUILD: "" },
  });
  process.exit(result.status ?? 1);
}

const result = spawnSync("opennextjs-cloudflare", ["build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, OPENNEXT_INNER_NEXT_BUILD: "1" },
});

if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);

const outputDir = ".open-next/assets";
const openNextWorker = join(outputDir, "open-next-worker.js");
const pagesWorker = join(outputDir, "_worker.js");

if (!existsSync(outputDir)) {
  console.error(`Cloudflare Pages output directory was not generated: ${outputDir}`);
  process.exit(1);
}

copyFileSync(".open-next/worker.js", openNextWorker);

for (const directory of ["cloudflare", "middleware", "server-functions", ".build"]) {
  const source = join(".open-next", directory);
  const target = join(outputDir, directory);
  if (existsSync(source)) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true });
  }
}

writeFileSync(pagesWorker, `import openNextWorker from "./open-next-worker.js";

function shouldTryStaticAsset(request) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const { pathname } = new URL(request.url);
  return pathname.startsWith("/_next/static/") || pathname.startsWith("/assets/") || pathname === "/favicon.ico" || /\\.[a-zA-Z0-9]{2,8}$/.test(pathname);
}

export default {
  async fetch(request, env, ctx) {
    if (shouldTryStaticAsset(request) && env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) return response;
    }
    return openNextWorker.fetch(request, env, ctx);
  },
};
`);

console.log(`Cloudflare Pages SSR output ready: ${outputDir}`);
