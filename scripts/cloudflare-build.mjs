import { spawnSync } from "node:child_process";

if (process.env.OPENNEXT_INNER_NEXT_BUILD === "1") {
  const result = spawnSync("next", ["build"], { stdio: "inherit", shell: true, env: { ...process.env, OPENNEXT_INNER_NEXT_BUILD: "" } });
  process.exit(result.status ?? 1);
}

const result = spawnSync("opennextjs-cloudflare", ["build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, OPENNEXT_INNER_NEXT_BUILD: "1" },
});

process.exit(result.status ?? 1);
