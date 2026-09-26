# Metrics definitions & interpretation

How analyze computes numbers and how to explain them to founders without overclaiming.

## Per-language share (%)

For the selected window and language set:

```text
share_pct(lang) = views(lang) / sum(views(all selected langs)) × 100
```

- **Share is relative to the languages you asked for**, not global Wikipedia traffic or population.
- Report **both** share and **absolute views** so tiny languages are not overweighted by percentage alone.
- Adding or removing a language changes everyone’s shares—note that in follow-ups.

## Growth slope

MVP definition (concrete, not a vague “growth %”):

- **Recent window**: last N days or months in range (CLI default aligned to granularity, e.g. last 30 days or last 3 months).
- **Baseline window**: the **same calendar span one year earlier** (YoY).
- **Slope / growth metric**: compare totals or averages between recent vs baseline (e.g. percent change or ratio), per language.

Interpretation:

- **Positive slope**: readership in that wiki edition rose vs the same period last year.
- **Negative or flat**: not necessarily “bad market”—check absolute volume and share.
- Short windows amplify noise; prefer ≥ 12 months monthly for strategic calls.

## Spikes & trust

- **Spike flag**: bucket or day unusually high vs local rolling baseline (implementation may use peak dates in `spikes[]`).
- **Low-volume trust warning**: when totals are small, YoY % swings are unreliable; caveats should say so.
- **Seasonality**: education topics spike in school terms; health topics follow news cycles—call out one-off spikes before recommending investment.

## Pageviews ≠ willingness to pay

Always state in user-facing answers:

- Pageviews measure **encyclopedia readership**, not conversion, ARPU, or course completion.
- High views can mean curiosity, homework, or news—not addressable market for a paid app.
- Use wiki stats to **prioritize what to validate next** (interviews, landing tests, ads), not as revenue forecasts.

## Relation to brief takeaways

| Brief section | Data source |
| --- | --- |
| Language expansion priority | `share_pct`, missing langlinks, growth slope |
| Market momentum | YoY slope, trend chart direction, spikes |
| Action item | Your synthesis: next locale to test or research—grounded in KPIs + caveats |

When the user asks “can we trust this?” lean on absolute levels, window length, spike flags, and [references/aqs.md](aqs.md) data quality notes.
