---
name: wiki-stats
description: Resolves Wikipedia topics to articles, fetches Wikimedia Analytics pageviews across language editions, and computes language demand share, YoY growth slopes, and spike flags. Writes SVG charts, CLI-generated Mermaid maps, brief.md, and a small JSON summary on stdout. Use for B2C topic research, localization priority, Wikipedia interest trends, cross-language audience comparison, and validating what to explore next (courses, apps, new languages)—pageviews are not willingness to pay. Keywords: pageviews, AQS, langlinks, intermittent fasting, astronomy, language learning, market momentum.
compatibility: Node 20+, npm install in skill root, outbound network (MediaWiki + Wikimedia Analytics APIs)
disable-model-invocation: true
---

# wiki-stats

CLI does fetch, math, charts, and briefs. You parse the user question, run the CLI once, then narrate from the **summary JSON** and **`brief.md`**—never reimplement analysis in chat.

## Hard rules

- **Never invent pageview numbers, shares, or growth rates.** Only cite values from CLI stdout or `brief.md`.
- **Never paste raw time-series** (daily/monthly arrays) into the reply. The summary JSON is the only numeric payload you need.
- **Prefer CLI Mermaid** from `brief.md` or `paths.relations_mmd` over drawing your own graphs (wrong titles and missing langlinks are common when freestyling).
- **Confirm only when the CLI returns `needs_confirmation`**. Ask once, re-run with `--title` or an explicit `lang:Title`; do not loop on resolve.
- **Always surface** Assumptions & limitations from summary `caveats[]` and the brief footer.
- **API / encoding / rate-limit errors** → read [references/aqs.md](references/aqs.md). Metric definitions → [references/metrics.md](references/metrics.md).

## Workflow checklist

1. **Parse** topic(s), target languages (ISO codes: `pl`, `cs`, `uk`, …), and date window. Default window: last **24 months** ending today unless the user specifies otherwise.
2. **Install once** (from this skill root): `npm install`
3. **Run the happy path** (preferred):

   ```bash
   npx wiki-stats run \
     --topic "intermittent fasting" \
     --langs pl,cs \
     --start YYYYMM \
     --end YYYYMM
   ```

   Equivalent: `node scripts/cli.js run ...`

4. If stdout includes **`needs_confirmation`**, show the candidate titles (2–3 max), ask the user once, then re-run with `--title "lang:Article_title"` (underscores as in Wikipedia URLs).
5. Read **stdout JSON**: `articles`, `kpis`, `per_lang[]`, `spikes[]`, `caveats[]`, `paths` (`brief.md`, SVGs, `relations.mmd`).
6. Open **`paths.brief`** (or the path printed). Use KPI strip, embedded Mermaid, chart images, and takeaways when composing the user-facing answer.
7. **Reply structure**: short executive answer → paste or summarize CLI Mermaid if helpful → three bullets aligned with brief takeaways → caveats. Point to on-disk `brief.md` and charts for sharing.

## Step commands (debug / cache reuse)

Use when adjusting one stage without repeating network calls (`.cache/` is keyed by project, title, range):

| Command   | Purpose                                                                                     |
| --------- | ------------------------------------------------------------------------------------------- |
| `resolve` | Search + langlinks; may emit `needs_confirmation`                                           |
| `fetch`   | AQS per-article pageviews                                                                   |
| `analyze` | Shares, growth slope, spikes → summary fields                                               |
| `chart`   | SVG: lang-share bar + trend line                                                            |
| `brief`   | Fill [assets/brief-template.md](assets/brief-template.md), write Mermaid to `relations.mmd` |
| `run`     | resolve → fetch → analyze → chart → brief; **prints only the small summary**                |

All subcommands support `--help`. Diagnostics go to stderr; **stdout stays JSON** for machine-readable summaries.

## Interpreting the summary

- **`per_lang[]`**: `lang`, resolved `title`, `views`, `share_pct`, `growth_slope`, trust/spike notes.
- **`kpis`**: combined views, top language, strongest growth—mirror the brief KPI strip.
- **`caveats[]`**: include pageviews ≠ monetization; low-volume warnings; missing langlinks.
- Do not extrapolate causality, revenue, or “users will pay” from views alone.

## Follow-up queries

Re-run `run` with new langs or dates; cached fetches reuse `.cache/`. For metric definitions or trust guidance, see [references/metrics.md](references/metrics.md). Future PDF, Wikidata graphs, and eval loops: [references/roadmap.md](references/roadmap.md).
