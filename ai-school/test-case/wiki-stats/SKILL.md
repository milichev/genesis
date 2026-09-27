---
name: wiki-stats
description: Evaluates B2C market demand and localization priorities by analyzing cross-language Wikipedia pageviews (AQS), computing YoY growth slopes and demand share, and outputting SVG charts, Mermaid maps, brief.md, and stdout JSON summary. Ideal for validating new app/course topics and cross-language audience interest (pageviews indicate curiosity, not willingness to pay).
compatibility: Node 20+, npm install in skill root, outbound network (MediaWiki + Wikimedia Analytics APIs)
disable-model-invocation: true
---

# wiki-stats

CLI does fetch, math, charts, and briefs. You parse the user question, run the CLI once, then narrate from the **summary JSON** and `brief.md`—never reimplement analysis in chat.

## Hard rules

- **Never invent pageview numbers, shares, or growth rates.** Only cite values from CLI stdout or `brief.md`.
- **Never paste raw time-series** (daily/monthly arrays) into the reply. The summary JSON is the only numeric payload you need.
- **Prefer CLI Mermaid** from `brief.md` or `paths.relations_mmd` over drawing your own graphs (wrong titles and missing langlinks are common when freestyling).
- **Confirm only when the CLI returns** `needs_confirmation`. Ask once, re-run with `--title` or an explicit `lang:Title`; do not loop on resolve.
- **Always surface** Assumptions & limitations from summary `caveats[]` and the brief footer.
- **API / encoding / rate-limit errors** → [references/aqs.md](references/aqs.md). Metric definitions → [references/metrics.md](references/metrics.md).

## Workflow checklist

1. **Parse** topic(s), target languages (ISO wiki codes: `pl`, `cs`, `uk`, …), and date window. Default: last **24 months** unless the user says otherwise. Ukrainian Wikipedia is **`uk`, not `ua`** (invalid codes fail before HTTP).
2. **Install once** (skill root): `npm install`.
3. **Estimate** (no network; same `--langs` / `--months` as the planned `run`):

   ```bash
   npx wiki-stats estimate --langs pl,cs,uk --months 24
   ```

   Stdout JSON: `estimation` (seconds) and optional `alert`. **`months` does not change the alert band**—only language count does. If `alert` is present, tell the user once (you may include `estimation`):

   | `alert`    | Phrase (UA)                                                         |
   | ---------- | ------------------------------------------------------------------- |
   | `Brief`    | трошки почекати                                                     |
   | `Moderate` | доведеться чекати                                                   |
   | `Extended` | довго чекати                                                        |
   | `Infinite` | безкінечність, скоріш за все, не дочекаємось — **ask before** `run` |

   Set tool wait **≥** `estimation + max(30, estimation)` (or 2× `estimation`). No busy-loop `sleep` in chat.
4. **Run** (one shot):

   ```bash
   npx wiki-stats run --topic "intermittent fasting" --langs pl,cs --months 24
   ```

   Use `--pivot` when the topic is non-Latin or should be searched on a specific wiki (default pivot `en`). Use `--title lang:Article_title` to skip search. `--start` / `--end` override the rolling window. `--out` sets the artifact directory. See `npx wiki-stats --help` for the full flag list.
5. **`needs_confirmation`** (exit 3): show 2–3 `candidates`, ask once, re-run with `--title "lang:Article_title"`. Do not retry resolve in a loop.
6. Read **stdout JSON**: `status`, `topic`, `articles`, `window`, `kpis`, `per_lang[]`, `spikes[]`, `caveats[]`, `paths` (`brief`, `relations_mmd`, charts, `out_dir`). On errors, stdout is still one JSON object—see [references/aqs.md](references/aqs.md).
7. Open `paths.brief`. Reply: short executive answer → CLI Mermaid if helpful → three bullets from takeaways → caveats. Point to on-disk artifacts for sharing.

Subcommands (`resolve`, `fetch`, `analyze`, `chart`, `brief`) exist for cache reuse; default path is **`run` only**. Stdout stays JSON; diagnostics on stderr.

## Interpreting the summary

- `articles[]`: `lang`, `title`, `status` (`pivot`, `linked`, `missing_langlink`, …), `url` when linked (omitted when not).
- `per_lang[]`: `views`, `share_pct`, `growth_pct`, `growth_label` — see [references/metrics.md](references/metrics.md).
- `kpis`, `spikes[]`, `caveats[]`: mirror the brief; pageviews ≠ monetization.

## Gotchas (demo-ready prompts)

Copy these patterns when testing or demoing:

| Scenario        | Example |
| --------------- | ------- |
| Small (no alert) | `run --topic "intermittent fasting" --langs pl,cs --months 24` |
| Alert `Brief`   | `estimate --langs pl,cs,uk,de,fr --months 24` (≥5 langs) |
| Non-Latin topic | `run --topic 'нірвана' --pivot uk --langs uk,de` — do not rely on bare EN pivot for Cyrillic |

- **Missing langlinks are not zero interest.** Use `--title` or one manual wiki check; else treat as **topic not yet localized**—a data gap, not proof of no demand. Example: `en:Intermittent_fasting` often has no `pl` langlink; `--langs pl,cs` may analyze **cs only** until `pl:…` is verified.
- **`--pivot` vs `--langs`:** search runs on pivot wiki; `--langs` selects editions to map via langlinks (plus pivot if listed).
- **Rate limits:** run `estimate` before long jobs; see [references/aqs.md](references/aqs.md).

## Follow-up

Re-run `run` with new langs or dates; `.cache/` speeds repeats. Roadmap (PDF, Wikidata, evals, **next-move FSM**): [references/roadmap.md](references/roadmap.md).
