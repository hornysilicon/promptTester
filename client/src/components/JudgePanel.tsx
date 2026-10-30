import { useEffect, useState } from "react";
import type { JudgeConfig, Variant } from "../types";
import { putJudgeConfig } from "../lib/api";

interface Props {
  judge: JudgeConfig;
  onChange(judge: JudgeConfig): void;
  baselineText: string;
  variants: Variant[];
}

const RESPONSE_PLACEHOLDER = "{{response}}";

function collectModelNames(texts: string[]): string[] {
  const models = new Set<string>();
  for (const text of texts) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        const model = (parsed as { model?: unknown }).model;
        if (typeof model === "string" && model !== "") models.add(model);
      }
    } catch {}
  }
  return [...models];
}

export default function JudgePanel({ judge, onChange, baselineText, variants }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    if (flash === null) return;
    const t = window.setTimeout(() => setFlash(null), 1500);
    return () => window.clearTimeout(t);
  }, [flash]);

  const models = collectModelNames([baselineText, ...variants.map((v) => v.text)]);
  const hasPlaceholder = judge.prompt.includes(RESPONSE_PLACEHOLDER);

  async function handleSave() {
    setSaving(true);
    try {
      await putJudgeConfig(judge);
      setFlash("saved");
    } catch {
      setFlash("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel judge-panel">
      <div className="judge-head">
        <button
          className="judge-collapse"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Collapse judge prompt" : "Expand judge prompt"}
        >
          {open ? "▾" : "▸"} Judge
        </button>
        <label
          className="judge-toggle-label"
          title="When on, responses are judged automatically after every run"
        >
          <input
            type="checkbox"
            checked={judge.enabled}
            onChange={(e) => onChange({ ...judge, enabled: e.target.checked })}
          />
          Auto-judge
        </label>
        <label className="judge-model-field" title="Model used for judging">
          <span>Model</span>
          <input
            list="judge-model-options"
            value={judge.model}
            onChange={(e) => onChange({ ...judge, model: e.target.value })}
            placeholder="blank = baseline model"
            spellCheck={false}
          />
          <datalist id="judge-model-options">
            {models.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <span className={hasPlaceholder ? "muted-note" : "judge-note-warn"}>
          {hasPlaceholder
            ? "Response inserted at {{response}}"
            : "No {{response}} placeholder — responses appended to the prompt"}
        </span>
        <button className="btn" disabled={saving} onClick={() => void handleSave()}>
          Save
        </button>
        {flash === "saved" ? <span className="save-flash saved">Saved</span> : null}
        {flash === "error" ? <span className="save-flash error">Save failed</span> : null}
      </div>
      {open ? (
        <textarea
          className="judge-prompt"
          spellCheck={false}
          value={judge.prompt}
          onChange={(e) => onChange({ ...judge, prompt: e.target.value })}
        />
      ) : null}
    </section>
  );
}
