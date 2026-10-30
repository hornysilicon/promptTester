import { useMemo, useRef, useState } from "react";
import { parseBodyText, toPrettyJson } from "../lib/lenient";
import ParsedView from "./ParsedView";

interface Props {
  title: string;
  value: string;
  onChange(v: string): void;
}

export default function RequestEditor({ title, value, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [mode, setMode] = useState<"raw" | "parsed">("raw");
  const fileRef = useRef<HTMLInputElement>(null);
  const validation = useMemo(() => parseBodyText(value), [value]);
  const isJson = validation.ok && validation.format === "json";
  const isJs = validation.ok && validation.format === "js";
  const showParsed = mode === "parsed" && validation.ok;

  async function loadFile(file: File) {
    const text = await file.text();
    const parsed = parseBodyText(text);
    if (parsed.ok && parsed.format === "js") {
      onChange(toPrettyJson(parsed.body));
    } else {
      onChange(text);
    }
  }

  function format() {
    if (isJson && validation.ok) {
      onChange(toPrettyJson(validation.body));
    }
  }

  function convertNow() {
    if (isJs && validation.ok) {
      onChange(toPrettyJson(validation.body));
    }
  }

  function switchToParsed() {
    if (!validation.ok) return;
    if (isJs) onChange(toPrettyJson(validation.body));
    setMode("parsed");
  }

  return (
    <section className={`panel editor-panel${dragOver ? " drag-over" : ""}`}>
      <div className="editor-header">
        <h2 className="editor-title">{title}</h2>
        {isJson ? <span className="valid-tag">Valid JSON</span> : null}
        <div className="editor-actions">
          <div className="mtog">
            <button className={mode === "raw" ? "mtog-on" : ""} onClick={() => setMode("raw")}>
              Raw
            </button>
            <button
              className={showParsed ? "mtog-on" : ""}
              disabled={!validation.ok}
              title={!validation.ok ? "Fix JSON errors first" : undefined}
              onClick={switchToParsed}
            >
              Parsed
            </button>
          </div>
          <button className="btn" disabled={!isJson} onClick={format}>
            Format
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Load file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void loadFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      {isJs ? (
        <div
          className="error-banner"
          style={{
            background: "rgba(210, 153, 34, 0.12)",
            borderColor: "rgba(210, 153, 34, 0.5)",
            color: "#e3b341",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>SillyTavern / JS object literal — will be converted</span>
          <button className="btn" onClick={convertNow}>
            Convert now
          </button>
        </div>
      ) : null}
      {!validation.ok ? <div className="error-banner">{validation.error}</div> : null}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void loadFile(file);
        }}
      >
        {showParsed && validation.ok ? (
          <ParsedView value={validation.body} onChange={(next) => onChange(toPrettyJson(next))} />
        ) : (
          <textarea
            className="editor"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text");
              const parsed = parseBodyText(text);
              if (parsed.ok && parsed.format === "js") {
                e.preventDefault();
                onChange(toPrettyJson(parsed.body));
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
