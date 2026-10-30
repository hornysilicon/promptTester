export type BodyParse =
  | { ok: true; body: object; format: "json" | "js" }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
