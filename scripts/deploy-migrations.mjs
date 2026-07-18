import { spawnSync } from "node:child_process";

const baselineMigration = "20260718080000_existing_schema_baseline";

function prisma(args) {
  return spawnSync("prisma", args, {
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
}

function print(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

let deployment = prisma(["migrate", "deploy"]);
if ((deployment.status ?? 1) === 0) {
  print(deployment);
  process.exit(0);
}

const output = `${deployment.stdout ?? ""}\n${deployment.stderr ?? ""}`;
if (!output.includes("P3005")) {
  print(deployment);
  process.exit(deployment.status ?? 1);
}

console.log("Existing database detected. Applying the approved Prisma migration baseline.");
const baseline = prisma(["migrate", "resolve", "--applied", baselineMigration]);
print(baseline);
if ((baseline.status ?? 1) !== 0) process.exit(baseline.status ?? 1);

deployment = prisma(["migrate", "deploy"]);
print(deployment);
process.exit(deployment.status ?? 1);
