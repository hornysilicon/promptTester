import express from "express";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_DIR, loadConfig, saveConfig, normalizeUrl } from "./config.mjs";
import { getRun, deleteRun, listRuns, saveRun } from "./storage.mjs";
import { applyJudging, executeRun } from "./runner.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(path.join(DATA_DIR, "runs"), { recursive: true });

const app = express();
app.use(express.json({ limit: "5mb" }));

function parseJudge(judge) {
  if (typeof judge !== "object" || judge === null || Array.isArray(judge)) return null;
  if (typeof judge.prompt !== "string" || judge.prompt.trim() === "") return null;
  const model = typeof judge.model === "string" ? judge.model : "";
  return { prompt: judge.prompt, model };
}

app.get("/api/config", async (req, res) => {
  res.json(await loadConfig());
});

app.put("/api/config", async (req, res) => {
  const { url, apiKey, timeoutMs } = req.body ?? {};
  if (typeof url !== "string" || url.length === 0) {
    return res.status(400).json({ error: "url must be a non-empty string" });
  }
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return res.status(400).json({ error: "url must be a valid URL" });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.status(400).json({ error: "url must use http or https" });
  }
  if (typeof apiKey !== "string") {
    return res.status(400).json({ error: "apiKey must be a string" });
  }
  if (typeof timeoutMs !== "number" || !(timeoutMs > 0)) {
    return res.status(400).json({ error: "timeoutMs must be a positive number" });
  }
  await saveConfig({ ...(await loadConfig()), url: normalizeUrl(url), apiKey, timeoutMs });
  res.json({ ok: true });
});

app.put("/api/config/judge", async (req, res) => {
  const { enabled, model, prompt } = req.body?.judge ?? req.body ?? {};
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "judge.enabled must be a boolean" });
  }
  if (typeof model !== "string") {
    return res.status(400).json({ error: "judge.model must be a string" });
  }
  if (typeof prompt !== "string") {
    return res.status(400).json({ error: "judge.prompt must be a string" });
  }
  await saveConfig({ ...(await loadConfig()), judge: { enabled, model, prompt } });
  res.json({ ok: true });
});

app.post("/api/execute", async (req, res) => {
  const { baseline, variants, judge } = req.body ?? {};
  if (
    typeof baseline !== "object" ||
    baseline === null ||
    Array.isArray(baseline)
  ) {
    return res
      .status(400)
      .json({ error: "baseline must be a non-null non-array object" });
  }
  const parsedJudge = judge === undefined ? null : parseJudge(judge);
  if (judge !== undefined && parsedJudge === null) {
    return res
      .status(400)
      .json({ error: "judge must be { prompt: non-empty string, model: string }" });
  }
  const rawVariants = Array.isArray(variants) ? variants : [];
  const normalized = rawVariants.map((v, index) => ({
    id: String(v?.id ?? index),
    name: v?.name ?? "",
    body: v?.body ?? {},
  }));
  const run = await executeRun({
    baseline,
    variants: normalized,
    judge: parsedJudge,
    config: await loadConfig(),
  });
  await saveRun(run);
  res.json(run);
});

app.post("/api/judge", async (req, res) => {
  const { runId, judge } = req.body ?? {};
  if (typeof runId !== "string" || runId === "") {
    return res.status(400).json({ error: "runId must be a non-empty string" });
  }
  const parsedJudge = parseJudge(judge);
  if (parsedJudge === null) {
    return res
      .status(400)
      .json({ error: "judge must be { prompt: non-empty string, model: string }" });
  }
  const run = await getRun(runId);
  if (!run) return res.status(404).json({ error: "not found" });
  await applyJudging({ run, judge: parsedJudge, config: await loadConfig() });
  await saveRun(run);
  res.json(run);
});

app.get("/api/runs", async (req, res) => {
  res.json({ runs: await listRuns() });
});

app.get("/api/runs/:id", async (req, res) => {
  const run = await getRun(req.params.id);
  if (!run) return res.status(404).json({ error: "not found" });
  res.json(run);
});

app.delete("/api/runs/:id", async (req, res) => {
  const deleted = await deleteRun(req.params.id);
  if (!deleted) return res.status(404).json({ error: "not found" });
  res.json({ ok: true });
});

const clientDist = path.resolve(__dirname, "..", "client", "dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

const port = process.env.PROMPT_TESTER_PORT || 8787;
app.listen(port, () => {
  console.log(`promptTester server listening on http://localhost:${port}`);
});
