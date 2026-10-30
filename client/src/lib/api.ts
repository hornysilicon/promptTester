import type { Config, JudgeConfig, JudgeSettings, RunResult, RunSummary } from "../types";

export interface ExecutePayload {
  baseline: object;
  variants: Array<{ id: string; name: string; body: object }>;
  judge?: JudgeSettings;
}

async function errorMessage(res: Response): Promise<string> {
  const fallback = `Request failed with status ${res.status}`;
  try {
    const data = (await res.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error !== "") {
      return data.error;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(await errorMessage(res));
  }
  return (await res.json()) as T;
}

export function getConfig(): Promise<Config> {
  return request<Config>("/api/config");
}

export function putConfig(config: Config): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
}

export function putJudgeConfig(judge: JudgeConfig): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/config/judge", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(judge),
  });
}

export function executeRun(payload: ExecutePayload): Promise<RunResult> {
  return request<RunResult>("/api/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listRuns(): Promise<RunSummary[]> {
  const data = await request<{ runs: RunSummary[] }>("/api/runs");
  return data.runs;
}

export function getRun(id: string): Promise<RunResult> {
  return request<RunResult>(`/api/runs/${encodeURIComponent(id)}`);
}

export function deleteRun(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/runs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function judgeRun(runId: string, judge: JudgeSettings): Promise<RunResult> {
  return request<RunResult>("/api/judge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runId, judge }),
  });
}
