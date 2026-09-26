# Iteration roadmap (post-MVP)

MVP delivers `brief.md`, two SVG charts, CLI Mermaid (`relations.mmd`), cache, and a tiny JSON summary via `wiki-stats run`. This file guides what to build next without breaking the Haiku-friendly one-shot CLI pattern.

## 1. One-page PDF export

**Goal:** Shareable single page like the assignment’s “PDF on one page.”

- Reuse [assets/brief-template.md](../assets/brief-template.md) structure: KPI strip → Mermaid → charts → three takeaways → limitations.
- Pipeline options: Markdown → HTML (embedded SVG) → print CSS → PDF (puppeteer, typst, or weasyprint-style HTML PDF).
- Keep **the same fields** the brief writer already fills so PDF is templating, not a second analytics path.
- Agent still runs CLI once; PDF path appears in summary `paths`.

## 2. Wikidata concept Mermaid

**Goal:** Richer “topic neighborhood” diagrams without LLM-invented edges.

- Query Wikidata for items linked from Wikipedia articles (instance-of, subclass, “main subject”).
- Emit additional Mermaid subgraphs: related concepts, not just lang→article resolution.
- **High debug risk**—keep behind a flag (`--wikidata`) after core `run` is stable.
- Agent rule unchanged: copy CLI Mermaid only.

## 3. Relative interest vs project totals

**Goal:** Normalize “how hot is this topic **within** pl.wikipedia” vs raw global pageviews.

- Fetch or estimate project-wide pageview totals per period.
- Metric example: article views / all pl.wikipedia views in window (density, not just cross-lang share).
- Helps compare niches of different scale; document in [metrics.md](metrics.md) when added.

## 4. Eval loop

**Goal:** Regression-test skill quality on cheap models.

- Run [evals/evals.json](../evals/evals.json) prompts against `wiki-stats run` with fixed date fixtures or recorded cache fixtures where possible.
- Assertions (automated or manual checklist):
  - Summary JSON under size budget (no embedded series arrays).
  - Artifacts exist: `brief.md`, both SVGs, `relations.mmd`.
  - Mermaid blocks present in brief; `caveats[]` non-empty where appropriate.
  - Agent reply cites CLI numbers only and includes limitations.
- Optional: OpenRouter Haiku/free tier pass documented in case study README.
- On CLI schema changes, update evals assertions and SKILL.md command examples together.

## Explicit non-goals (until green)

- Revenue forecasting, causal inference, paid-search correlation.
- Interactive dashboards.
- Agent-written analysis scripts instead of the packaged CLI.
