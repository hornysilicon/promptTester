import { useState } from "react";
import type { RequestResult } from "../types";
import HtmlFrame from "./HtmlFrame";

interface Props {
  results: RequestResult[];
  onRecover(): void;
  onPromote(result: RequestResult): void;
}

function resultKey(result: RequestResult): string {
  return result.variantId ?? "baseline";
}

function prettyJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2);
  return text === undefined ? "undefined" : text;
}

function formatSeconds(ms: number): string {
  const secs = ms / 1000;
  if (secs < 10) return secs.toFixed(1);
  if (secs < 100) return secs.toFixed(0);
  return Math.round(secs).toLocaleString();
}

function thinkingLabel(r: RequestResult): string {
  const reasoningTokens = r.reasoningTokens ?? null;
  const completionTokens = r.usage?.completion_tokens ?? null;
  if (
    reasoningTokens !== null &&
    reasoningTokens > 0 &&
    typeof completionTokens === "number" &&
    completionTokens > 0
  ) {
    const estimate = (r.latencyMs * reasoningTokens) / completionTokens;
    return `Thought for ~${formatSeconds(estimate)}s`;
  }
  if (reasoningTokens !== null && reasoningTokens > 0) {
    return `Thought for ${reasoningTokens.toLocaleString()} tok`;
  }
  return "Thought";
}

export default function SideBySide({ results, onRecover, onPromote }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [renderHtml, setRenderHtml] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const expandedCount = results.filter((r) => !collapsed.has(resultKey(r))).length;
  const canCollapse = expandedCount > 2;

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      if (!canCollapse) return prev;
      next.add(key);
      return next;
    });
  }

  return (
    <section className="panel sbs-panel">
      <div className="sbs-header">
        <span className="sbs-title">Responses — side by side</span>
        <button
          className={`sbs-raw-btn${showRaw ? " on" : ""}`}
          onClick={() => setShowRaw((v) => !v)}
          title="Show raw response JSON instead of parsed content"
        >
          Raw
        </button>
        {showRaw ? null : (
          <label className="sbs-toggle-label">
            <input
              type="checkbox"
              checked={renderHtml}
              onChange={(e) => setRenderHtml(e.target.checked)}
              title="Render HTML elements in responses; off shows raw text"
            />
            Render HTML
          </label>
        )}
        <button
          className="btn btn-small"
          onClick={onRecover}
          title="Load this run's baseline and variants back into the editor"
        >
          Recover
        </button>
      </div>
      <div className="sbs">
        {results.map((r, i) => {
          const key = resultKey(r);
          if (collapsed.has(key)) {
            return (
              <div
                className="sbs-col collapsed"
                key={key}
                onClick={() => toggleCollapsed(key)}
                title="Expand column"
              >
                <span className="sbs-chev-mark">{i === 0 ? "›" : "‹"}</span>
                <span className="sbs-vname">{r.name}</span>
              </div>
            );
          }
          const chev = (
            <button
              className="sbs-chev"
              onClick={() => toggleCollapsed(key)}
              disabled={!canCollapse}
              title={canCollapse ? "Collapse column" : "Keep at least two columns open"}
            >
              {i === 0 ? "‹" : "›"}
            </button>
          );
          return (
            <div className="sbs-col" key={key}>
              <div className="sbs-head">
                {i === 0 ? chev : null}
                <span className="sbs-name">{r.name}</span>
                <span className={r.kind === "baseline" ? "badge" : "badge variant"}>
                  {r.kind}
                </span>
                <span className={r.ok ? "sbs-meta" : "sbs-meta sbs-err"}>
                  {r.ok
                    ? `${r.status ?? "?"} · ${r.latencyMs}ms${
                        r.usage !== null
                          ? ` · ${r.usage.prompt_tokens}→${r.usage.completion_tokens} tok`
                          : ""
                      }`
                    : "ERR"}
                </span>
                {r.kind === "variant" ? (
                  <button
                    className="sbs-promote"
                    onClick={() => onPromote(r)}
                    title="Start a new round with this variant as the baseline"
                  >
                    Make baseline
                  </button>
                ) : null}
                {i === 0 ? null : chev}
              </div>
              {!r.ok ? (
                <div className="sbs-error">{r.error ?? "Request failed"}</div>
              ) : !showRaw && typeof r.reasoning === "string" && r.reasoning !== "" ? (
                <>
                  <details className="sbs-thinking">
                    <summary
                      title="Estimated thinking time: reasoning tokens × (latency / completion tokens)"
                    >
                      <span className="thinking-chev">▸</span>
                      <span className="thinking-label">{thinkingLabel(r)}</span>
                    </summary>
                    <pre className="thinking-body">{r.reasoning}</pre>
                  </details>
                  {renderHtml && r.content !== null ? (
                    <HtmlFrame html={r.content} />
                  ) : (
                    <div className="sbs-text">
                      {r.content ?? prettyJson(r.responseBody)}
                      {r.content === null ? (
                        <p className="muted-note sbs-fallback-note">
                          assistant content missing — raw JSON shown
                        </p>
                      ) : null}
                    </div>
                  )}
                </>
              ) : showRaw ? (
                <pre className="sbs-raw">{prettyJson(r.responseBody)}</pre>
              ) : renderHtml && r.content !== null ? (
                <HtmlFrame html={r.content} />
              ) : (
                <div className="sbs-text">
                  {r.content ?? prettyJson(r.responseBody)}
                  {r.content === null ? (
                    <p className="muted-note sbs-fallback-note">
                      assistant content missing — raw JSON shown
                    </p>
                  ) : null}
                </div>
              )}
              {r.judge != null ? (
                <details className="judge-verdict sbs-judge">
                  <summary>
                    <span>{r.judge.ok ? "Judge verdict" : "Judge failed"}</span>
                    <span className="judge-meta">
                      {r.judge.model} · {r.judge.latencyMs} ms
                    </span>
                  </summary>
                  {r.judge.error !== null ? (
                    <div className="error-banner">{r.judge.error}</div>
                  ) : null}
                  {r.judge.content !== null ? <pre>{r.judge.content}</pre> : null}
                </details>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
