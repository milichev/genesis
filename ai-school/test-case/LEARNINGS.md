# LEARNINGS — `wiki-stats` skill case study

---

## Architecture

- **CLI = worker, LLM = strategist.** Scripts own AQS/MediaWiki, metrics, SVG, Mermaid, `brief.md`. Agent only narrates from compact JSON + artifacts. Never dump raw time series into context.
- **One-shot** `run` for Haiku; step subcommands (`resolve`/`fetch`/…) for debug and cache reuse.
- **Confirm only on real ambiguity** (`needs_confirmation`, exit 3). Otherwise auto-resolve via search + langlinks.

## Product cuts (3h MVP)

- Ship `brief.md` **+ SVG + Mermaid**; PDF deferred (reuse brief layout later).
- No Wikidata / category-graph topic expansion in MVP.
- Metrics that stuck: **lang share %**, **growth = recent window vs YoY baseline**, spike flags, low-volume trust caveats.

## Stack

- Node ESM that **ships as written** (no `tsc`/`tsx`). npm + lockfile; prefer zero deps (`fetch`).
- pnpm was dropped for simplicity.

## Agent Skills / “publishing”

- [skills.sh](https://www.skills.sh/) is a **leaderboard**, not an upload portal.
- Distribute by git/local path: `npx skills add <path|owner/repo>`. Skill needs discoverable `SKILL.md`.
- Install telemetry drives ranking; no separate publish API.

## Ops pain (→ stabilize plan)

- Uncaught **HTTP 429** killed `run` with a stack trace. Need: global pacer (~350ms, 1 in-flight), honor `Retry-After`, JSON error on stdout, partial continue per lang.
- Wikimedia: meaningful User-Agent + contact; UA-only ≈ 200 req/min; ≤3 concurrent ([rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)).
- Disk `.cache/` makes re-runs cheap; still pace first-hit bursts.
- Langlinks from en often miss locales (e.g. pl for intermittent fasting) — use `--title pl:…`; don’t invent stats. Ukrainian code is `uk`, not `ua`.

## Viz

- **SVG** = quantities (share bar + trend). **Mermaid** = relations (resolution map + audience priority), **CLI-generated** so models don’t freestyle wrong titles.

## Process

- Grill before build: MVP cut + auto-resolve policy locked the architecture.
- Parallel cheap agents (CLI vs docs) raced on `SKILL.md` — reconcile against real CLI flags before calling done.
- Haiku smoke: one-shot works; document 429 backoff + “not localized” data-gap wording in `SKILL.md`.
