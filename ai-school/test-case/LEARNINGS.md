# LEARNINGS — `wiki-stats` skill case study

---

## Architecture

- **CLI = worker, LLM = strategist.** Scripts own AQS/MediaWiki, metrics, SVG, Mermaid, `brief.md`. Agent narrates from compact JSON + artifacts only.
- **One-shot** `run` for Haiku; step cmds for debug/cache. Confirm only on `needs_confirmation` (exit 3).
- **Severity & validation live in CLI** — agent relays `alert`, never thresholds seconds; bad langs/`--pivot` fail before HTTP.

## Product cuts

- MVP: `brief.md` + SVG + Mermaid; PDF/Wikidata deferred.
- Metrics that stuck: lang share %, YoY growth slope, spikes, low-volume caveats.
- Phase 3 cut: no `invalid_language` status, no empty-search→try-`--langs`, no `next-move` code — FSM stays in [roadmap.md](wiki-stats/references/roadmap.md).
- `missing_langlink` = data gap; omit null `title`/`url`. Non-Latin → `--pivot` / `--title`, not magic.

## Stack

- Node ESM as-written, zero runtime deps (`fetch`). Invoke absolute `node $CLI` — never `npm install` / `npx` from wrong cwd. HTTP cache → `~/.cache/wiki-stats` (skill dir under `~/.agents` is often EPERM). `node:test` for contract tests.
- Skills install (`npx skills add`) is human SDLC ([README.md](README.md) § Development) — not agent Hard rules.

## Ops

- Pacer ~350ms + `Retry-After`; stdout always JSON on failure; partial continue per lang.
- Ukrainian wiki = `uk`, not `ua`. `--pivot en:Title` is invalid (use `--title`).
- `estimate` alert bands follow **lang count**, not months (monthly AQS = 1 GET/lang).

## Viz

- SVG = quantities. Mermaid = relations, CLI-owned; labels are plain `lang:title` — Cursor Mermaid preview does not render `<a href>` (shows raw HTML).

## Process

- Grill → lock DoD before code. Demo pitch needs **prepared prompts**, not just green tests.
- Same agent writing tests+impl is fine for a small contract suite; fairness ≠ two-agent tax in a 1h cut.
- Parallel agents racing on `SKILL.md` → always reconcile flags against real CLI before done.
