import { useEffect, useState } from "react";
import type { Config } from "../types";
import { putConfig } from "../lib/api";

interface Props {
  config: Config;
  onSave(config: Config): void;
}

export default function ConfigBar({ config, onSave }: Props) {
  const [draft, setDraft] = useState<Config>(config);
  const [flash, setFlash] = useState<"saved" | "error" | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  useEffect(() => {
    if (flash === null) return;
    const t = window.setTimeout(() => setFlash(null), 1500);
    return () => window.clearTimeout(t);
  }, [flash]);

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await putConfig(draft);
      onSave(draft);
      setFlash("saved");
    } catch {
      setFlash("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="config-bar">
      <label className="url-field">
        <span>URL</span>
        <input
          value={draft.url}
          onChange={(e) => set("url", e.target.value)}
          placeholder="https://api.openai.com/v1/chat/completions"
          spellCheck={false}
        />
      </label>
      <label>
        <span>API Key</span>
        <input
          type="password"
          value={draft.apiKey}
          onChange={(e) => set("apiKey", e.target.value)}
        />
      </label>
      <label className="timeout-field">
        <span>Timeout (ms)</span>
        <input
          type="number"
          value={draft.timeoutMs}
          onChange={(e) =>
            set("timeoutMs", e.target.value === "" ? 0 : Number(e.target.value))
          }
        />
      </label>
      <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
        Save
      </button>
      {flash === "saved" ? <span className="save-flash saved">Saved</span> : null}
      {flash === "error" ? <span className="save-flash error">Save failed</span> : null}
    </div>
  );
}
