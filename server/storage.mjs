import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./config.mjs";

const RUNS_DIR = path.join(DATA_DIR, "runs");

export async function saveRun(run) {
  await mkdir(RUNS_DIR, { recursive: true });
  await writeFile(
    path.join(RUNS_DIR, `${run.id}.json`),
    JSON.stringify(run, null, 2),
  );
}

export async function listRuns() {
  let files;
  try {
    files = await readdir(RUNS_DIR);
  } catch {
    return [];
  }
  const runs = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const run = JSON.parse(await readFile(path.join(RUNS_DIR, file), "utf8"));
      runs.push({
        id: run.id,
        createdAt: run.createdAt,
        requestCount: run.requestCount,
      });
    } catch {}
  }
  runs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return runs;
}

export async function getRun(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(RUNS_DIR, `${id}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function deleteRun(id) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return false;
  try {
    await unlink(path.join(RUNS_DIR, `${id}.json`));
    return true;
  } catch (e) {
    if (e && typeof e === "object" && e.code === "ENOENT") return false;
    throw e;
  }
}
