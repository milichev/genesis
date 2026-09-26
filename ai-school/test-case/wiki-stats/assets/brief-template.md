# {{TITLE}}

**Window:** {{WINDOW_START}} — {{WINDOW_END}} · **Granularity:** {{GRANULARITY}} · **Pivot:** {{PIVOT_LANG}}:{{PIVOT_TITLE}}

## KPI strip

| Combined views   | Top language (share)                 | Strongest growth (slope) | Spike flags    |
| ---------------- | ------------------------------------ | ------------------------ | -------------- |
| {{KPI_COMBINED}} | {{KPI_TOP_LANG}} ({{KPI_TOP_SHARE}}) | {{KPI_TOP_GROWTH}}       | {{KPI_SPIKES}} |

## Topic & language map

Resolution: how the query topic maps to Wikipedia articles per language. Dashed nodes = no langlink (data gap, not invented titles).

{{MERMAID_RESOLUTION}}

## Audience priority

Languages ranked by demand share and/or growth slope (from analyze output).

{{MERMAID_AUDIENCE}}

## Charts

![Language demand share]({{CHART_SHARE_PATH}})

![Views trend (rolling mean when daily)]({{CHART_TREND_PATH}})

## Takeaways

1. **Language expansion priority:** {{TAKEAWAY_LANG}}
2. **Market momentum:** {{TAKEAWAY_MOMENTUM}}
3. **Action item:** {{TAKEAWAY_ACTION}}

## Assumptions & limitations

- Wikipedia **pageviews measure readership interest**, not course sales, app downloads, or willingness to pay.
- **Absolute levels and share %** both matter: a high growth rate on a tiny base is less actionable than moderate growth at scale.
- **Spikes** (news events, celebrity mentions, SEO) can distort short windows; see spike flags and prefer longer windows when judging trust.
- **Missing langlinks** mean we did not fetch that language—not zero interest in the market.
- Granularity: monthly for long windows; daily (with smoothing) for windows roughly ≤ 90 days.

{{LIMITATIONS}}
