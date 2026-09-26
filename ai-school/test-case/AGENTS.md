# test-case — agent context

---

PES case study: build an **Agent Skill** that helps B2C founders judge topic/language demand from Wikipedia pageviews ([README.md](./README.md) if present; assignment lives with this folder).

## Deliverable

Skill directory: `[wiki-stats/](wiki-stats/)` — Agent Skills layout (`SKILL.md` + runnable code). Not markdown-only instructions.

## Plans (source of truth for intent)


| Plan      | Path                                                                                                                   | Status |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| MVP       | `[.cursor/plans/1-wiki-stats_skill_mvp_f8ea83f8.plan.md](../../.cursor/plans/1-wiki-stats_skill_mvp_f8ea83f8.plan.md)` | Done   |
| Stabilize | `[.cursor/plans/2-wiki-stats_stabilize_51e6a3c5.plan.md](../../.cursor/plans/2-wiki-stats_stabilize_51e6a3c5.plan.md)` | Next   |




## How to run (from skill root)

```bash
cd wiki-stats
node scripts/cli.js run --topic "…" --langs pl,cs --months 24
```

Stdout = small JSON summary only. Artifacts under `output/` (`brief.md`, SVGs, Mermaid). Never invent pageview numbers.

## Constraints that matter

- Optimize for cheap tool-using models (Haiku-class): one-shot `run`, not long tool loops.
- Stack: Node 20+ ESM, npm, **no TypeScript/transpile**.
- Pageviews ≠ willingness to pay; always surface caveats.
- `missing_langlink` = data gap, not zero demand.

