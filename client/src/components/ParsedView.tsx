import { useState } from "react";

interface Props {
  value: object;
  onChange(next: object): void;
}

type Path = (string | number)[];

interface Ctx {
  isCollapsed(key: string, fallback: boolean): boolean;
  toggle(key: string, fallback: boolean): void;
  set(path: Path, nextValue: unknown): void;
}

function setAtPath(node: unknown, path: Path, nextValue: unknown): unknown {
  if (path.length === 0) return nextValue;
  const [head, ...rest] = path;
  if (Array.isArray(node)) {
    const copy = node.slice();
    const index = Number(head);
    copy[index] = setAtPath(node[index], rest, nextValue);
    return copy;
  }
  if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    const key = String(head);
    const copy = { ...record };
    copy[key] = setAtPath(record[key], rest, nextValue);
    return copy;
  }
  return node;
}

function isBoxValue(v: unknown): boolean {
  return typeof v === "object" && v !== null;
}

function StringEditor({ text, path, ctx }: { text: string; path: Path; ctx: Ctx }) {
  const key = path.join("/");
  const long = text.length > 300 || text.includes("\n");
  const collapsed = ctx.isCollapsed(key, long);
  if (!long) {
    return (
      <textarea
        className="pstr"
        rows={1}
        spellCheck={false}
        value={text}
        onChange={(e) => ctx.set(path, e.target.value)}
      />
    );
  }
  if (collapsed) {
    return (
      <div className="pprev-row" onClick={() => ctx.toggle(key, true)}>
        <span className="pchev">▸</span>
        <span className="pprev">{text}</span>
      </div>
    );
  }
  return (
    <div className="pstr-block">
      <div className="pstr-head" onClick={() => ctx.toggle(key, false)}>
        <span className="pchev open">▸</span>
      </div>
      <textarea
        className="pstr"
        spellCheck={false}
        rows={Math.min(20, text.split("\n").length + 1)}
        value={text}
        onChange={(e) => ctx.set(path, e.target.value)}
      />
    </div>
  );
}

function LeafEditor({ val, path, ctx }: { val: unknown; path: Path; ctx: Ctx }) {
  if (typeof val === "string") {
    return <StringEditor text={val} path={path} ctx={ctx} />;
  }
  if (typeof val === "number") {
    return (
      <input
        className="pnum"
        type="number"
        value={val}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") return;
          const n = Number(raw);
          if (Number.isFinite(n)) ctx.set(path, n);
        }}
      />
    );
  }
  if (typeof val === "boolean") {
    return (
      <input
        className="pbool"
        type="checkbox"
        checked={val}
        onChange={(e) => ctx.set(path, e.target.checked)}
      />
    );
  }
  return <span className="pnull">null</span>;
}

function NodeView({
  label,
  val,
  path,
  depth,
  ctx,
}: {
  label: string;
  val: unknown;
  path: Path;
  depth: number;
  ctx: Ctx;
}) {
  if (!isBoxValue(val)) {
    return <LeafEditor val={val} path={path} ctx={ctx} />;
  }
  const key = path.join("/");
  const isArray = Array.isArray(val);
  const defaultCollapsed = depth >= 1;
  const collapsed = ctx.isCollapsed(key, defaultCollapsed);
  const entries: [string, unknown][] = isArray
    ? (val as unknown[]).map((item, i) => [String(i), item])
    : Object.entries(val as Record<string, unknown>);
  const childPath = (k: string): Path => [...path, isArray ? Number(k) : k];
  return (
    <div className={`pbox pd${Math.min(depth, 3)}`}>
      <div className="pbox-header" onClick={() => ctx.toggle(key, defaultCollapsed)}>
        <span className={collapsed ? "pchev" : "pchev open"}>▸</span>
        {label !== "" ? <span className="pkey">{label}</span> : null}
        <span className="psize">{isArray ? `[${(val as unknown[]).length}]` : `{${entries.length}}`}</span>
      </div>
      {collapsed ? null : (
        <div className="pbox-body">
          {entries.map(([k, v]) => (
            <div className="prow" key={k}>
              {isBoxValue(v) ? (
                <NodeView label={k} val={v} path={childPath(k)} depth={depth + 1} ctx={ctx} />
              ) : (
                <>
                  <span className="pkey">{k}</span>
                  <LeafEditor val={v} path={childPath(k)} ctx={ctx} />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ParsedView({ value, onChange }: Props) {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const ctx: Ctx = {
    isCollapsed(key, fallback) {
      return Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : fallback;
    },
    toggle(key, fallback) {
      setOverrides((prev) => {
        const current = Object.prototype.hasOwnProperty.call(prev, key) ? prev[key] : fallback;
        return { ...prev, [key]: !current };
      });
    },
    set(path, nextValue) {
      onChange(setAtPath(value, path, nextValue) as object);
    },
  };

  return (
    <div className="pwrap">
      <NodeView label="" val={value} path={[]} depth={0} ctx={ctx} />
    </div>
  );
}
