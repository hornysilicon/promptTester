# promptTester

Paste a request, clone it into variants, fire them all, compare responses side by side. That's it.

## Launch

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite binds to all interfaces, so `http://<lan-ip>:5173` works too (or `ssh -L 5173:localhost:5173` if you like tunnels).

`npm start` instead = one process on :8787 serving the built app (`npm run build` first).

## Use

1. **URL + API key** (top bar). Any OpenAI-compatible endpoint. Paste a full URL or just a base (`http://localhost:5001/v1` — `/chat/completions` gets appended). Saved to `data/config.json`.
2. **Baseline**: paste your request body. JSON, or a raw SillyTavern log (unquoted JS object with `+`-concatenated strings) — it gets converted to proper JSON automatically. Paste or drag-drop a `.json` file.
3. **Variants**: hit `+` (clones the active tab), edit anything — model, temp, messages. Rename by double-click. **Raw | Parsed** toggle: parsed shows every key as a collapsible box with readable, newline-respecting, editable text.
4. **Run all**: requests go out sequentially. Every request in a run shares one seed — baseline's seed wins, otherwise one is generated (shown in the UI). No excuses for noisy comparisons.
5. **Results**: status/latency/tokens per request, then all responses side by side. Collapse columns down to two if you want. HTML in responses (fonts, details, inline CSS) is rendered in a sandboxed iframe — untick "Render HTML" for raw text.
6. **Judge**: write an evaluation prompt in the Judge panel — `{{response}}` marks where each response gets inserted (no placeholder = responses appended as the user message). Pick a judge model (blank = baseline's model), flip on Auto-judge to score every run automatically, or hit **Judge** on any run (including old ones from History) to (re)judge it. Verdicts show under each response and in the side-by-side columns. Judge settings live in `data/config.json`.
7. **History**: click a past run to reload it; hover an entry and hit `×` to delete it for good.

## Files

- `data/config.json` — endpoint config (has your API key in plain text, it's a local tool, deal with it)
- `data/runs/*.json` — every run saved forever (until you delete it from the History sidebar), reload from there too

## Dev

```bash
npm run typecheck
npm run build
```

Express API in `server/`, React app in `client/`. That's the whole tour.

## Screenshots

![promptTester screenshot 1](images/Screenshot%202026-10-30%20at%2011.12.06.png)

![promptTester screenshot 2](images/Screenshot%202026-10-30%20at%2011.12.34.png)
