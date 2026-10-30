interface Props {
  running: boolean;
  canRun: boolean;
  blockedReason: string | null;
  effectiveSeed: number | null;
  seedSource: "baseline" | "variant" | "generated" | undefined;
  judgeActive: boolean;
  judgeModel: string;
  onRun(): void;
}

export default function RunBar({
  running,
  canRun,
  blockedReason,
  effectiveSeed,
  seedSource,
  judgeActive,
  judgeModel,
  onRun,
}: Props) {
  const disabled = running || !canRun;
  return (
    <section className="panel run-bar">
      <button
        className="btn btn-primary run-btn"
        disabled={disabled}
        title={blockedReason ?? undefined}
        onClick={onRun}
      >
        Run all
      </button>
      {running ? (
        <span className="running-note">
          <span className="spinner" />
          Running requests sequentially…
        </span>
      ) : null}
      {effectiveSeed !== null ? (
        <span className="seed-note">
          Seed synced to {effectiveSeed}{" "}
          {seedSource === "variant"
            ? "(from a variant)"
            : seedSource === "generated"
              ? "(auto-generated — set a seed in the baseline to pin it)"
              : "(from baseline)"}
        </span>
      ) : (
        <span className="muted-note">No seed set — responses may vary</span>
      )}
      {judgeActive ? (
        <span className="muted-note">
          Judge on · {judgeModel.trim() !== "" ? judgeModel.trim() : "baseline model"}
        </span>
      ) : null}
    </section>
  );
}
