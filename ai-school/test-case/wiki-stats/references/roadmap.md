# Iteration roadmap (post-MVP)

MVP delivers `brief.md`, two SVG charts, CLI Mermaid (`relations.mmd`), cache, and a tiny JSON summary via `wiki-stats run`. Phase 3 hardens alerts, lang validation, Mermaid links, and docs. **Next big bet** is below; PDF/Wikidata/evals stay later without breaking the one-shot CLI pattern.

## 1. Agent ↔ CLI state machine (`next-move`) — next bet

**Goal:** Cheap models stop guessing flags and retry loops; the CLI tells the agent exactly one next step until the run reaches a milestone.

**Shape (design only until implemented):**

- **Agnostic engine:** shared `next-move` runner (graph traversal, JSON schema, exit codes)—not wiki-stats-specific logic in the core.
- **Skill-specific graph:** wiki-stats defines nodes (e.g. `parse_intent` → `estimate` → `confirm_alert` → `run` → `needs_confirmation` → `done`) and edges keyed off stdout `status`, exit code, and summary fields.
- **JSON “next instruction”:** stdout includes something like `{ "next": "run", "args": { … }, "reason": "…" }` or `"wait_seconds"` after `estimate` when `alert` is set—agent executes that single step instead of re-reading a long checklist.
- **Milestone mark:** graph marks `demo_complete` / `brief_ready` when `paths.brief` exists and `status` is `ok` or `partial`—useful for evals and future `next-move`-driven UIs.

**Resolve stays simple until FSM ships:** no empty OpenSearch → auto-try other `--langs`. Agents use **`--pivot`** for non-Latin topics and **`--title lang:Article`** when langlinks or search are ambiguous (see [SKILL.md](../SKILL.md) gotchas).

**Out of scope for Phase 3:** shipping `wiki-stats next-move` or a generic FSM package—this section is the product direction.

## 2. One-page PDF export

**Goal:** Shareable single page like the assignment’s “PDF on one page.”

- Reuse [assets/brief-template.md](../assets/brief-template.md): KPI strip → Mermaid → charts → takeaways → limitations.
- Pipeline: Markdown → HTML (embedded SVG) → print CSS → PDF (puppeteer, typst, or similar).
- Same fields the brief writer already fills; PDF path in summary `paths` when added.
- Agent still runs CLI once.

## 3. Wikidata concept Mermaid

**Goal:** Richer topic neighborhood diagrams without LLM-invented edges.

- Wikidata items from Wikipedia articles (instance-of, subclass, main subject).
- Additional Mermaid subgraphs behind `--wikidata` after core `run` is stable.
- Agent rule unchanged: copy CLI Mermaid only.

## 4. Relative interest vs project totals

**Goal:** Normalize topic heat **within** e.g. pl.wikipedia vs raw cross-lang views.

- Article views / project totals per period; document in [metrics.md](metrics.md) when added.

## 5. Eval loop

**Goal:** Regression-test skill quality on cheap models.

- Run [evals/evals.json](../evals/evals.json) against `wiki-stats run` with fixtures/cache where possible.
- Assert summary size, artifacts, Mermaid in brief, caveats, agent cites CLI only.
- On schema changes, update evals and SKILL.md together.

## Explicit non-goals

- Revenue forecasting, causal inference, paid-search correlation.
- Interactive dashboards.
- Agent-written analysis scripts instead of the packaged CLI.
- Runtime `invalid_language` article status (fail-fast at CLI parse instead).
- Multilang `--topic:lang` sugar.
