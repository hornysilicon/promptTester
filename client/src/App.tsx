import { useCallback, useEffect, useState } from "react";
import ConfigBar from "./components/ConfigBar";
import JudgePanel from "./components/JudgePanel";
import RequestEditor from "./components/RequestEditor";
import ResponseCard from "./components/ResponseCard";
import RunBar from "./components/RunBar";
import SideBySide from "./components/SideBySide";
import VariantTabs from "./components/VariantTabs";
import { deleteRun, executeRun, getConfig, getRun, judgeRun, listRuns } from "./lib/api";
import { parseBodyText } from "./lib/lenient";
import type { Config, JudgeConfig, RunResult, RunSummary, Variant } from "./types";

const EXAMPLE_BASELINE = `{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a concise assistant."
    },
    {
      "role": "user",
      "content": "Explain what a random seed is in one sentence."
    }
  ],
  "temperature": 0.7,
  "seed": 42
}`;

function variantLabel(variant: Variant, index: number): string {
  return variant.name !== "" ? variant.name : `V${index + 1}`;
}

function bodyOf(text: string): object {
  const parsed = parseBodyText(text);
  return parsed.ok ? parsed.body : {};
}

const INITIAL_JUDGE: JudgeConfig = { enabled: false, model: "", prompt: "" };

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${months[d.getMonth()]} ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [baselineText, setBaselineText] = useState(EXAMPLE_BASELINE);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [activeId, setActiveId] = useState("baseline");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [judging, setJudging] = useState(false);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [judge, setJudge] = useState<JudgeConfig>(INITIAL_JUDGE);

  const refreshHistory = useCallback(async () => {
    try {
      setHistory(await listRuns());
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    getConfig()
      .then((c) => {
        setConfig(c);
        setJudge(c.judge ?? INITIAL_JUDGE);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
    void refreshHistory();
  }, [refreshHistory]);

  const baselineValid = parseBodyText(baselineText).ok;
  const invalidVariantNames = variants
    .map((v, i) => ({ name: variantLabel(v, i), ok: parseBodyText(v.text).ok }))
    .filter((x) => !x.ok)
    .map((x) => x.name);
  const canRun = baselineValid && invalidVariantNames.length === 0;
  let blockedReason: string | null = null;
  if (!baselineValid) {
    blockedReason = "Baseline body is invalid";
  } else if (invalidVariantNames.length > 0) {
    blockedReason = `Invalid body in: ${invalidVariantNames.join(", ")}`;
  }

  const activeVariant = variants.find((v) => v.id === activeId) ?? null;

  function handleAddVariant() {
    const source = activeVariant !== null ? activeVariant.text : baselineText;
    let text = source;
    try {
      const parsed: unknown = JSON.parse(source);
      if (typeof parsed === "object" && parsed !== null) {
        text = JSON.stringify(parsed, null, 2);
      }
    } catch {
      text = source;
    }
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    setVariants((vs) => [...vs, { id, name: "", text }]);
    setActiveId(id);
  }

  function handleRenameVariant(id: string, name: string) {
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, name: name.trim() } : v)));
  }

  function handleDeleteVariant(id: string) {
    setVariants((vs) => vs.filter((v) => v.id !== id));
    if (activeId === id) {
      setActiveId("baseline");
    }
  }

  async function handleRun() {
    if (!canRun || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const judgePayload =
        judge.enabled && judge.prompt.trim() !== ""
          ? { prompt: judge.prompt, model: judge.model }
          : undefined;
      const result = await executeRun({
        baseline: bodyOf(baselineText),
        variants: variants.map((v, i) => ({
          id: v.id,
          name: variantLabel(v, i),
          body: bodyOf(v.text),
        })),
        judge: judgePayload,
      });
      setRunResult(result);
      await refreshHistory();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  async function handleRejudge() {
    if (runResult === null || judging || judge.prompt.trim() === "") return;
    setJudging(true);
    setRunError(null);
    try {
      const updated = await judgeRun(runResult.id, {
        prompt: judge.prompt,
        model: judge.model,
      });
      setRunResult(updated);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    } finally {
      setJudging(false);
    }
  }

  async function handleSelectRun(id: string) {
    try {
      const result = await getRun(id);
      setRunResult(result);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDeleteRun(id: string) {
    if (!window.confirm("Delete this run from history?")) return;
    try {
      await deleteRun(id);
      if (runResult !== null && runResult.id === id) {
        setRunResult(null);
      }
      await refreshHistory();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : String(e));
    }
  }

  if (config === null) {
    return (
      <div className="app-loading">
        {loadError !== null ? `Failed to load config: ${loadError}` : "Loading…"}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="app-title">promptTester</h1>
        <ConfigBar config={config} onSave={setConfig} />
      </header>
      <main className="main-col">
        <VariantTabs
          variants={variants}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={handleAddVariant}
          onRename={handleRenameVariant}
          onDelete={handleDeleteVariant}
        />
        {activeVariant !== null ? (
          <RequestEditor
            title={variantLabel(activeVariant, variants.indexOf(activeVariant))}
            value={activeVariant.text}
            onChange={(text) =>
              setVariants((vs) =>
                vs.map((v) => (v.id === activeVariant.id ? { ...v, text } : v))
              )
            }
          />
        ) : (
          <RequestEditor title="Baseline" value={baselineText} onChange={setBaselineText} />
        )}
        <JudgePanel
          judge={judge}
          onChange={setJudge}
          baselineText={baselineText}
          variants={variants}
        />
        <RunBar
          running={running}
          canRun={canRun}
          blockedReason={blockedReason}
          effectiveSeed={runResult?.effectiveSeed ?? null}
          seedSource={runResult?.seedSource}
          judgeActive={judge.enabled && judge.prompt.trim() !== ""}
          judgeModel={judge.model}
          onRun={handleRun}
        />
        {runError !== null ? <div className="error-banner run-error">{runError}</div> : null}
        {runResult !== null ? (
          <section className="results">
            <div className="results-meta">
              <span>{new Date(runResult.createdAt).toLocaleString()}</span>
              <span>{runResult.requestCount} requests</span>
              <button
                className="btn btn-small rejudge-btn"
                disabled={judging || judge.prompt.trim() === ""}
                title={
                  judge.prompt.trim() === ""
                    ? "Write a judge prompt first (Judge panel)"
                    : "Re-run judging on this run with the current judge prompt"
                }
                onClick={() => void handleRejudge()}
              >
                {judging ? (
                  <>
                    <span className="spinner" /> Judging…
                  </>
                ) : (
                  "Judge"
                )}
              </button>
            </div>
            <div className="response-list">
              {runResult.results.map((r) => (
                <ResponseCard key={`${r.kind}:${r.variantId ?? "baseline"}`} result={r} />
              ))}
            </div>
            <SideBySide results={runResult.results} />
          </section>
        ) : null}
      </main>
      <aside className="panel sidebar">
        <h2 className="sidebar-title">History</h2>
        {history.length === 0 ? (
          <p className="muted-note">No runs yet</p>
        ) : (
          <ul className="history-list">
            {history.map((h) => (
              <li key={h.id} className="history-row">
                <button className="history-item" onClick={() => void handleSelectRun(h.id)}>
                  {formatWhen(h.createdAt)} · {h.requestCount} reqs
                </button>
                <button
                  className="history-delete"
                  title="Delete run"
                  onClick={() => void handleDeleteRun(h.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
