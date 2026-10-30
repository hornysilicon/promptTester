import { useState } from "react";
import type { RequestResult } from "../types";
import HtmlFrame from "./HtmlFrame";

interface Props {
  results: RequestResult[];
}

function resultKey(result: RequestResult): string {
  return result.variantId ?? "baseline";
}

function fallbackText(result: RequestResult): string {
  const text = JSON.stringify(result.responseBody, null, 2);
  return text === undefined ? "undefined" : text;
}

export default function SideBySide({ results }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [renderHtml, setRenderHtml] = useState(true);

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
        <label className="sbs-toggle-label">
          <input
            type="checkbox"
            checked={renderHtml}
            onChange={(e) => setRenderHtml(e.target.checked)}
            title="Render HTML elements in responses; off shows raw text"
          />
          Render HTML
        </label>
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
                  {r.ok ? `${r.status ?? "?"} · ${r.latencyMs}ms` : "ERR"}
                </span>
                {i === 0 ? null : chev}
              </div>
              {!r.ok ? (
                <div className="sbs-error">{r.error ?? "Request failed"}</div>
              ) : renderHtml && r.content !== null ? (
                <HtmlFrame html={r.content} />
              ) : (
                <div className="sbs-text">
                  {r.content ?? fallbackText(r)}
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
                    <span className="judge-meta">{r.judge.model}</span>
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
