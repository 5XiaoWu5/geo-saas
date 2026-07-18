import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const requestFiles = [...sourceFiles("src/features/competitor-benchmark"), ...sourceFiles("src/app/api/competitors")];

for (const file of requestFiles) {
  const source = readFileSync(file, "utf8");
  for (const forbidden of ["CREATE TABLE", "ALTER TABLE", "ensureSchema", "ensureCompetitorSchema"]) {
    if (source.includes(forbidden)) throw new Error(`${file} contains forbidden request-time DDL marker: ${forbidden}`);
  }
}

console.log("Competitor request paths contain no runtime DDL markers.");
