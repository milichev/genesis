---

## name: wiki-stats

description: Evaluates B2C market demand and localization priorities by analyzing cross-language Wikipedia pageviews (AQS), computing YoY growth slopes and demand share, and outputting SVG charts, Mermaid maps, brief.md, and stdout JSON summary. Ideal for validating new app/course topics and cross-language audience interest (pageviews indicate curiosity, not willingness to pay).
compatibility: Node 20+, npm install in skill root, outbound network (MediaWiki + Wikimedia Analytics APIs)
disable-model-invocation: true

# wiki-stats

CLI does fetch, math, charts, and briefs. You parse the user question, run the CLI once, then narrate from the **summary JSON** and `brief.md`—never reimplement analysis in chat.

## Hard rules

- **Never invent pageview numbers, shares, or growth rates.** Only cite values from CLI stdout or `brief.md`.
- **Never paste raw time-series** (daily/monthly arrays) into the reply. The summary JSON is the only numeric payload you need.
- **Prefer CLI Mermaid** from `brief.md` or `paths.relations_mmd` over drawing your own graphs (wrong titles and missing langlinks are common when freestyling).
- **Confirm only when the CLI returns** `needs_confirmation`. Ask once, re-run with `--title` or an explicit `lang:Title`; do not loop on resolve.
- **Always surface** Assumptions & limitations from summary `caveats[]` and the brief footer.
- **API / encoding / rate-limit errors** → read [references/aqs.md](references/aqs.md). Metric definitions → [references/metrics.md](references/metrics.md). **Install / publish** → [references/publish.md](references/publish.md).



## Workflow checklist

1. **Parse** topic(s), target languages (ISO codes: `pl`, `cs`, `uk`, …), and date window. Default window: last **24 months** ending today unless the user specifies otherwise. Ukrainian Wikipedia is `uk`, not `ua`.
2. **Install once** (from this skill root): `npm install`
3. **Estimate wall time** (no network; same `--langs` / `--months` as the planned `run`):

```bash
 npx wiki-stats estimate --langs pl,cs,uk --months 24
```

Stdout JSON includes `estimation` (seconds, cold path) and optional `alert` (`Brief` | `Moderate` | `Extended` | `Infinite`). **If** `alert` **is present**, tell the user once using this phrase bank (you may include `estimation` seconds):


| `alert`    | Phrase (UA)                                                         |
| ---------- | ------------------------------------------------------------------- |
| `Brief`    | трошки почекати                                                     |
| `Moderate` | доведеться чекати                                                   |
| `Extended` | довго чекати                                                        |
| `Infinite` | безкінечність, скоріш за все, не дочекаємось — **ask before** `run` |


Call `run` with tool wait **≥** `estimation + margin`, where **margin = max(30, estimation)** seconds (alternatively 2× `estimation`). Do not busy-loop `sleep` in chat.

1. **Run the happy path** (preferred):

```bash
 npx wiki-stats run \
   --topic "intermittent fasting" \
   --langs pl,cs \
   --months 24
```

*Equivalent*: `node scripts/cli.js run ...` (from this skill root, after `npm install`).
**Flags (match CLI):**


| Flag                | Role                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `--topic`           | Search phrase (required unless you pass `--title` only via `resolve` path)                 |
| `--langs`           | Comma-separated ISO codes (default `en`)                                                   |
| `--months`          | Rolling window length when `--start`/`--end` omitted (default **24**, monthly granularity) |
| `--pivot`           | Wiki language for search when topic is ambiguous (default **en**)                          |
| `--title`           | Skip search: `en:Intermittent_fasting` or bare title on pivot wiki                         |
| `--start` / `--end` | Explicit AQS range (`YYYYMM` monthly, `YYYYMMDD` daily)                                    |
| `--out`             | Output directory (default `output/<slug>-<timestamp>` under skill root)                    |
| `--log=<file>`      | Append paced HTTP log (see `--help`)                                                       |


1. **Ambiguous resolve:** stdout JSON with `"status":"needs_confirmation"` and **exit code 3**. Show 2–3 `candidates`, ask once, re-run with `--title "lang:Article_title"` (underscores as in Wikipedia URLs). Do not retry resolve in a loop.
2. **HTTP / rate limits:** the CLI paces requests and retries 429/503 with `Retry-After`; on failure stdout is still **one JSON object** (`status: "error"`), not a stack trace. Partial runs may return `status: "partial"` when some langs fail. See [references/aqs.md](references/aqs.md).
3. Read **stdout JSON** (single line, no raw series): `status`, `topic`, `articles` (each with `url` when linked), optional `estimation` / `alert`, `window`, `kpis`, `per_lang[]`, `spikes[]`, `caveats[]`, `paths` (`brief`, `relations_mmd`, `chart_lang_share`, `chart_trend`, `out_dir`).
4. Open `paths.brief` (or the path printed). Use KPI strip, embedded Mermaid, chart images, and takeaways when composing the user-facing answer.
5. **Reply structure**: short executive answer → paste or summarize CLI Mermaid if helpful → three bullets aligned with brief takeaways → caveats. Point to on-disk `brief.md` and charts for sharing.



## Step commands (debug / cache reuse)

Use when adjusting one stage without repeating network calls (`.cache/` is keyed by project, title, range):


| Command    | Purpose                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------- |
| `estimate` | Cold-path wall time + optional `alert` (no network)                                         |
| `resolve`  | Search + langlinks; may emit `needs_confirmation`                                           |
| `fetch`    | AQS per-article pageviews                                                                   |
| `analyze`  | Shares, growth slope, spikes → summary fields                                               |
| `chart`    | SVG: lang-share bar + trend line                                                            |
| `brief`    | Fill [assets/brief-template.md](assets/brief-template.md), write Mermaid to `relations.mmd` |
| `run`      | resolve → fetch → analyze → chart → brief; **prints only the small summary**                |


All subcommands support `--help` (see `scripts/cli.js` usage for full flag list). Diagnostics go to stderr; **stdout stays JSON** for machine-readable summaries. `run` **/** `resolve` **exit 3** when confirmation is required.

## Interpreting the summary

- `articles[]`: resolved `lang`, `title`, `status` (`pivot`, `linked`, `missing_langlink`, `fetch_error`, `resolve_error`), `url` (Wikipedia article link or `null`).
- `per_lang[]`: `lang`, `views`, `share_pct`, `growth_pct`, `growth_label` (YoY-style recent vs baseline; see [references/metrics.md](references/metrics.md)).
- `kpis`: `combined_views`, `top_lang`, `top_share_pct`, `top_growth_lang`, `top_growth_pct` — mirror the brief KPI strip.
- `spikes[]`: flagged high buckets/days per language (check before treating momentum as structural).
- `caveats[]`: pageviews ≠ monetization; low-volume warnings; missing langlinks.
- Do not extrapolate causality, revenue, or “users will pay” from views alone.



## Gotchas

- **Missing langlinks are not zero interest.** Try `--title` or manual wiki search once; if still unresolved, treat as **topic not yet localized** on that wiki—a **data gap**, not proof of no demand. Do not invent views/share/growth for that lang. Example: `en:Intermittent_fasting` often has **no pl langlink**—`--langs pl,cs` may analyze **cs only** until `pl:…` is verified. Mermaid shows dashed `missing langlink` nodes; caveats list skipped langs.
- `--pivot` **vs** `--langs`**:** Search runs on pivot wiki (default `en`); `--langs` only selects which editions to map via langlinks (plus pivot if listed).
- **Rate limits:** use `estimate` before long runs; CLI global pacer + retries; cached AQS under `.cache/` speeds re-runs. See [references/aqs.md](references/aqs.md).



## Follow-up queries

Re-run `run` with new langs or dates; cached fetches reuse `.cache/`. For metric definitions or trust guidance, see [references/metrics.md](references/metrics.md). Future PDF, Wikidata graphs, and eval loops: [references/roadmap.md](references/roadmap.md).