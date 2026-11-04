export interface JudgeConfig {
  enabled: boolean;
  model: string;
  prompt: string;
}

export interface Config {
  url: string;
  apiKey: string;
  timeoutMs: number;
  reasoning: boolean;
  judge: JudgeConfig;
}

export interface JudgeSettings {
  prompt: string;
  model: string;
}

export interface JudgeResult {
  model: string;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  content: string | null;
  usage: Usage | null;
  error: string | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface RequestResult {
  kind: "baseline" | "variant";
  variantId: string | null;
  name: string;
  requestBody: object;
  ok: boolean;
  status: number | null;
  latencyMs: number;
  content: string | null;
  usage: Usage | null;
  reasoning?: string | null;
  reasoningTokens?: number | null;
  injectedReasoning?: boolean;
  responseBody: unknown;
  error: string | null;
  judge?: JudgeResult | null;
}

export interface RunResult {
  id: string;
  createdAt: string;
  requestCount: number;
  effectiveSeed: number | null;
  seedSource?: "baseline" | "variant" | "generated";
  results: RequestResult[];
  judge?: JudgeSettings | null;
}

export interface Variant {
  id: string;
  name: string;
  text: string;
}

export interface RunSummary {
  id: string;
  createdAt: string;
  requestCount: number;
}
