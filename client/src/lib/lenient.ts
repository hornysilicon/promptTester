export type BodyParse =
  | { ok: true; body: object; format: "json" | "js" | "lumiverse" }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const LUMIVERSE_SECTION = /^###\s*\[\d+\]\s*(SYSTEM|USER|ASSISTANT)\s*$/;
const LUMIVERSE_PARAMS = /^###\s*PARAMETERS\s*$/;

function looksLikeLumiverse(trimmed: string): boolean {
  const firstBreak = trimmed.indexOf("\n");
  const firstLine = firstBreak === -1 ? trimmed : trimmed.slice(0, firstBreak);
  if (!/^#\s+\S/.test(firstLine)) {
    return false;
  }
  return trimmed.split("\n").some((line) => LUMIVERSE_SECTION.test(line));
}

function parseLumiverse(trimmed: string): BodyParse {
  const lines = trimmed.replace(/\r\n?/g, "\n").split("\n");

  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  const headerMatch = /^#\s+(.+?)\s*$/.exec(lines[i] ?? "");
  if (!headerMatch) {
    return { ok: false, error: "Not a Lumiverse export (missing `# provider / model` header)" };
  }
  const rawModel = headerMatch[1];
  const sep = rawModel.indexOf(" / ");
  const model = sep >= 0 ? rawModel.slice(sep + 3) : rawModel;

  const messages: { role: string; content: string }[] = [];
  const paramLines: string[] = [];
  let current: { role: string; lines: string[] } | null = null;
  let inParams = false;

  function flush() {
    if (current === null) return;
    const content = current.lines;
    let start = 0;
    let end = content.length;
    while (start < end && content[start].trim() === "") start++;
    while (end > start && content[end - 1].trim() === "") end--;
    messages.push({ role: current.role, content: content.slice(start, end).join("\n") });
    current = null;
  }

  for (i = i + 1; i < lines.length; i++) {
    const line = lines[i];
    const section = LUMIVERSE_SECTION.exec(line);
    if (section) {
      flush();
      inParams = false;
      current = { role: section[1].toLowerCase(), lines: [] };
    } else if (LUMIVERSE_PARAMS.test(line)) {
      flush();
      inParams = true;
    } else if (current !== null) {
      current.lines.push(line);
    } else if (inParams) {
      paramLines.push(line);
    }
  }
  flush();

  if (messages.length === 0) {
    return { ok: false, error: "Lumiverse export has no `### [N] ROLE` message sections" };
  }

  let params: Record<string, unknown> = {};
  if (paramLines.length > 0) {
    let raw = paramLines.join("\n").trim();
    const fence = /^```[^\n]*\n([\s\S]*?)\n?```\s*$/.exec(raw);
    if (fence) raw = fence[1].trim();
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return { ok: false, error: "Lumiverse PARAMETERS block must be a JSON object" };
      }
      params = parsed as Record<string, unknown>;
    } catch (e) {
      return {
        ok: false,
        error:
          "Lumiverse PARAMETERS block is not valid JSON: " +
          (e instanceof Error ? e.message : String(e)),
      };
    }
  }

  const body: Record<string, unknown> = { model, messages, ...params };
  return { ok: true, body, format: "lumiverse" };
}

export function parseBodyText(text: string): BodyParse {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, error: "empty" };
  }

  let jsonError: string | null = null;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (isPlainObject(parsed)) {
      return { ok: true, body: parsed, format: "json" };
    }
    jsonError = "Top-level JSON value must be an object";
  } catch (e) {
    jsonError = e instanceof Error ? e.message : String(e);
  }

  if (looksLikeLumiverse(trimmed)) {
    return parseLumiverse(trimmed);
  }

  const stripped = trimmed.replace(/[\s;]+$/, "");
  if (stripped !== "") {
    try {
      const evaluated: unknown = new Function('"use strict"; return (' + stripped + ');')();
      if (isPlainObject(evaluated)) {
        return { ok: true, body: evaluated, format: "js" };
      }
    } catch {}
  }

  const suffix =
    trimmed.startsWith("{")
      ? " — if this is a SillyTavern log it may be truncated"
      : "";
  return { ok: false, error: (jsonError ?? "Could not parse body") + suffix };
}

export function toPrettyJson(body: object): string {
  return JSON.stringify(body, null, 2);
}
