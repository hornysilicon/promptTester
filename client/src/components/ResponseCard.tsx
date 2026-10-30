import type { RequestResult } from "../types";

function pretty(value: unknown): string {
  const text = JSON.stringify(value, null, 2);
  return text === undefined ? "undefined" : text;
}

export default function ResponseCard({ result }: { result: RequestResult }) {
  return (
    <article className="response-card">
      <div className="response-head">
        <span className="response-name">{result.name}</span>
        <span className={`badge ${result.kind}`}>{result.kind}</span>
        <span className={`chip ${result.ok ? "chip-ok" : "chip-err"}`}>
          {result.ok ? (result.status ?? 200) : (result.status ?? "ERR")}
        </span>
        <span className="latency">{result.latencyMs} ms</span>
      </div>
      {result.usage !== null ? (
        <div className="usage">
          {result.usage.prompt_tokens} → {result.usage.completion_tokens} tok (
          {result.usage.total_tokens})
        </div>
      ) : null}
      {result.error !== null ? <div className="error-banner">{result.error}</div> : null}
      {result.content !== null ? <pre className="content">{result.content}</pre> : null}
      {result.judge != null ? (
        <details className="judge-verdict">
          <summary>
            <span>{result.judge.ok ? "Judge verdict" : "Judge failed"}</span>
            <span className="judge-meta">
              {result.judge.model} · {result.judge.latencyMs} ms
            </span>
          </summary>
          {result.judge.error !== null ? (
            <div className="error-banner">{result.judge.error}</div>
          ) : null}
          {result.judge.content !== null ? <pre>{result.judge.content}</pre> : null}
        </details>
      ) : null}
      <details className="raw">
        <summary>Raw response</summary>
        <pre>{pretty(result.responseBody)}</pre>
      </details>
    </article>
  );
}
