import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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
const workerTarget = join(outputDir, "_worker.js");

if (!existsSync(outputDir)) {
  console.error(`Cloudflare Pages output directory was not generated: ${outputDir}`);
  process.exit(1);
}

copyFileSync(".open-next/worker.js", workerTarget);

for (const directory of ["cloudflare", "middleware", "server-functions", ".build"]) {
  const source = join(".open-next", directory);
  const target = join(outputDir, directory);
  if (existsSync(source)) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true });
  }
}

console.log(`Cloudflare Pages SSR output ready: ${outputDir}`);
