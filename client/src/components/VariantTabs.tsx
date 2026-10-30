import { useState } from "react";
import type { Variant } from "../types";

interface Props {
  variants: Variant[];
  activeId: string;
  onSelect(id: string): void;
  onAdd(): void;
  onRename(id: string, name: string): void;
  onDelete(id: string): void;
}

function isValidBody(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null;
  } catch {
    return false;
  }
}

export default function VariantTabs({
  variants,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDelete,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  function commitRename() {
    if (renamingId !== null) {
      onRename(renamingId, renameText);
    }
    setRenamingId(null);
  }

  return (
    <div className="tabs-row">
      <div className="tabs">
        <button
          className={`tab${activeId === "baseline" ? " active" : ""}`}
          onClick={() => onSelect("baseline")}
        >
          Baseline
        </button>
        {variants.map((v, i) => {
          const label = v.name !== "" ? v.name : `V${i + 1}`;
          const active = v.id === activeId;
          const invalid = !isValidBody(v.text);
          return (
            <div key={v.id} className={`tab${active ? " active" : ""}`}>
              {renamingId === v.id ? (
                <input
                  autoFocus
                  className="rename-input"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <>
                  <button
                    className="tab-label"
                    title="Double-click to rename"
                    onClick={() => onSelect(v.id)}
                    onDoubleClick={() => {
                      setRenamingId(v.id);
                      setRenameText(v.name);
                    }}
                  >
                    {label}
                    {invalid ? <span className="warn-dot" title="Invalid JSON" /> : null}
                  </button>
                  <button
                    className="tab-close"
                    title="Delete variant"
                    onClick={() => onDelete(v.id)}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          );
        })}
        <button className="tab-add" title="Add variant from current tab" onClick={onAdd}>
          +
        </button>
      </div>
    </div>
  );
}
