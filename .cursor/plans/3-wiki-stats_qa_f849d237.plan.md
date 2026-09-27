---
name: wiki-stats phase 3
overview: "1h Phase 3 (demo-ready): fix estimate alerts, fail-fast lang validation, Mermaid article links, omit-null article fields, slim SKILL + prune AGENTS/publish, a few tests-first assertions. next-move FSM → roadmap only."
todos:
  - id: tests-first
    content: "Write 4–6 failing node:test assertions (estimate alert bands, bad --pivot, omit-nulls, Mermaid href); wire npm test"
    status: pending
  - id: estimate-alert
    content: Recalibrate alert on langCount; assumptions.months_affect_requests=false
    status: pending
  - id: lang-validation
    content: assertWikiLang on --langs/--pivot/lang: prefix; reject colon-in-pivot and ua→uk hint; exit 2 JSON
    status: pending
  - id: mermaid-omit
    content: Mermaid <a href> on linked/pivot nodes; omit title/url keys on missing_langlink
    status: pending
  - id: docs-prune
    content: Slim SKILL; demote publish.md; AGENTS Phase3 + prune dead; roadmap § next-move FSM; demo prompt notes
    status: pending
isProject: false
---

# wiki-stats Phase 3 — Hardened (1h, demo pitch)

**Signed off after grill.** DoD = convincing screen-share demo, not a framework.

## Locked decisions

| Lock  | Choice                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| DoD   | **Quality only** — no `next-move` code this hour                                                                                |
| FSM   | Design lives in [`references/roadmap.md`](genesis/ai-school/test-case/wiki-stats/references/roadmap.md) (rewrite/add section)   |
| Tests | **One agent, tests-first** — few evaluator-readable cases; then green                                                           |
| Cuts  | No `invalid_language`; no empty-search→try-`--langs`; no multilang `--topic:lang`                                               |
| Keep  | Mermaid links; publish demotion; **prune dead AGENTS instructions**                                                             |
| Demo  | Prompt prep is part of the work — document good prompts (`--pivot uk` for Cyrillic, `uk` not `ua`, small vs ≥5 langs for alert) |

## In scope (~1h)

1. **`estimate` alert** — buckets on `langCount`: omit `<5`, `Brief` 5–9, `Moderate` 10–19, `Extended` 20–49, `Infinite` ≥50. Keep `estimation` seconds. `assumptions.months_affect_requests: false`. File: [`scripts/lib/estimate.js`](genesis/ai-school/test-case/wiki-stats/scripts/lib/estimate.js).

2. **Lang fail-fast** — `assertWikiLang` (`/^[a-z]{2,3}$/`, reject `:`, reject `ua` with “use uk”). Apply to `--langs`, `--pivot`, explicit `lang:Title` **before HTTP**. Bad `--pivot en:Nirvana` → JSON error exit 2. No runtime `invalid_language` article status.

3. **Mermaid links + omit nulls** — [`brief.js`](genesis/ai-school/test-case/wiki-stats/scripts/brief.js) pivot/linked labels include `<a href='…'>article</a>`; missing nodes plain. `missing_langlink` articles: `{lang, status}` only.

4. **Tests-first (4–6)** — `node --test`; assert exact JSON shapes for: 2 langs no alert / 5 langs `Brief`; bad pivot CLI; omit-null article shape; Mermaid contains `href`. No network. Evaluator can read and re-run `npm test`.

5. **Docs prune**
   - Slim [`SKILL.md`](genesis/ai-school/test-case/wiki-stats/SKILL.md): fix frontmatter, one numbered checklist, drop flag-table bloat; keep alert phrases + demo gotchas (`uk` not `ua`, `--pivot` for non-Latin).
   - Remove publish from agent Hard rules; keep [`publish.md`](genesis/ai-school/test-case/wiki-stats/references/publish.md) for humans; point from [`AGENTS.md`](genesis/ai-school/test-case/AGENTS.md).
   - **Prune dead AGENTS instructions** (stale run tips, duplicate constraints, obsolete plan notes).
   - Add Phase 3 row to AGENTS plans table.
   - **Rewrite** [`roadmap.md`](genesis/ai-school/test-case/wiki-stats/references/roadmap.md): lead with **agent↔CLI state machine (`next-move`)** as next big bet (agnostic engine, skill-specific graph, JSON “next instruction”, milestone mark); keep PDF/Wikidata/evals as later; drop or demote “try langs on empty search” if it conflicts with “keep resolve simple” (optional note under resolve: use `--pivot` / `--title` until FSM).

## Out of scope (explicit)

- `wiki-stats next-move` / generic FSM implementation
- `invalid_language` status
- Empty OpenSearch → iterate `--langs`
- Vitest, new npm deps, PDF, Wikidata
- Two-agent TDD handoff

## Execution order

```text
1. Write failing tests (tests-first)
2. estimate.js + langs.js + CLI wire
3. omit-nulls + Mermaid href
4. SKILL / AGENTS prune / publish demote / roadmap FSM section
5. npm test green + one smoke: estimate 2 vs 5 langs; --pivot en:Nirvana rejects
```

## Demo prompt prep (do with docs)

Ship 2–3 ready prompts in AGENTS or a short note in SKILL gotchas, e.g.:

- Small (no alert): `--langs pl,cs --months 24` + known EN topic
- Alert Brief: ≥5 langs
- Non-Latin: `--topic 'нірвана' --pivot uk --langs uk,de` (not bare EN pivot)

## Pitch angle (why this is convincing)

CLI owns severity and validation; agent cannot invent wait thresholds or poke bad hosts; Mermaid is clickable; `npm test` shows the contract; roadmap sells the FSM vision without shipping unfinished interop.
