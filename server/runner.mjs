import { randomBytes, randomInt } from "node:crypto";

function extractContent(responseBody) {
  const content = responseBody?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n");
  }
  return null;
}

function extractUsage(responseBody) {
  const usage = responseBody?.usage;
  if (!usage) return null;
  const { prompt_tokens, completion_tokens, total_tokens } = usage;
  if (
    typeof prompt_tokens === "number" &&
    typeof completion_tokens === "number" &&
    typeof total_tokens === "number"
  ) {
    return { prompt_tokens, completion_tokens, total_tokens };
  }
  return null;
}

async function sendRequest({ body, config }) {
  const sentBody = { ...body, stream: false };
  const start = Date.now();
  let ok = false;
  let status = null;
  let responseBody = null;
  let content = null;
  let usage = null;
  let error = null;
  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sentBody),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    const text = await res.text();
    status = res.status;
    ok = res.ok;
    if (!ok) error = `HTTP ${status}: ${text.slice(0, 300)}`;
    try {
      responseBody = JSON.parse(text);
    } catch {
      responseBody = text;
    }
    content = extractContent(responseBody);
    usage = extractUsage(responseBody);
  } catch (e) {
    ok = false;
    status = null;
    responseBody = null;
    content = null;
    usage = null;
    error =
      e.name === "TimeoutError" || e.name === "AbortError"
        ? `Request timed out after ${config.timeoutMs}ms`
        : e.message;
  }
  return {
    requestBody: sentBody,
    ok,
    status,
    latencyMs: Date.now() - start,
    content,
    usage,
    responseBody,
    error,
  };
}

function buildJudgeMessages(prompt, responseText) {
  if (prompt.includes("{{response}}")) {
    return [{ role: "user", content: prompt.split("{{response}}").join(responseText) }];
  }
  return [
    { role: "system", content: prompt },
    { role: "user", content: responseText },
  ];
}

export async function applyJudging({ run, judge, config }) {
  let fallbackModel = "";
  const first = run.results[0];
  if (
    first !== undefined &&
    typeof first.requestBody === "object" &&
    first.requestBody !== null &&
    typeof first.requestBody.model === "string"
  ) {
    fallbackModel = first.requestBody.model;
  }
  const model = judge.model.trim() !== "" ? judge.model.trim() : fallbackModel;
  for (const result of run.results) {
    if (typeof result.content !== "string" || result.content === "") continue;
    const sent = await sendRequest({
      body: {
        model,
        temperature: 0,
        seed: run.effectiveSeed,
        messages: buildJudgeMessages(judge.prompt, result.content),
      },
      config,
    });
    result.judge = {
      model,
      ok: sent.ok,
      status: sent.status,
      latencyMs: sent.latencyMs,
      usage: sent.usage,
      content: sent.content,
      error: sent.error,
    };
  }
  run.judge = { prompt: judge.prompt, model: judge.model.trim() };
  return run;
}

export async function executeRun({ baseline, variants, judge, config }) {
  let effectiveSeed = null;
  let seedSource = "generated";
  if (typeof baseline.seed === "number") {
    effectiveSeed = baseline.seed;
    seedSource = "baseline";
  } else {
    for (const variant of variants) {
      if (typeof variant.body?.seed === "number") {
        effectiveSeed = variant.body.seed;
        seedSource = "variant";
        break;
      }
    }
  }
  if (effectiveSeed === null) {
    effectiveSeed = randomInt(0, 2 ** 31);
  }

  const targets = [
    { kind: "baseline", variantId: null, name: "Baseline", body: baseline },
    ...variants.map((variant, index) => ({
      kind: "variant",
      variantId: variant.id,
      name: variant.name || `Variant ${index + 1}`,
      body: variant.body,
    })),
  ];

  const results = [];
  for (const target of targets) {
    const stampedBody = { ...target.body, seed: effectiveSeed };
    const result = await sendRequest({ body: stampedBody, config });
    results.push({
      kind: target.kind,
      variantId: target.variantId,
      name: target.name,
      ...result,
    });
  }

  const run = {
    id: `run-${Date.now()}-${randomBytes(2).toString("hex")}`,
    createdAt: new Date().toISOString(),
    requestCount: results.length,
    effectiveSeed,
    seedSource,
    results,
  };
  if (judge !== null) {
    await applyJudging({ run, judge, config });
  }
  return run;
}
