---
name: wiki-stats
description: Evaluates B2C market demand and localization priorities by analyzing cross-language Wikipedia pageviews (AQS), computing YoY growth slopes and demand share, and outputting SVG charts, Mermaid maps, brief.md, and stdout JSON summary. Ideal for validating new app/course topics and cross-language audience interest (pageviews indicate curiosity, not willingness to pay).
compatibility: Node 20+, zero npm deps, outbound network (MediaWiki + Wikimedia Analytics APIs)
disable-model-invocation: true
---

# wiki-stats

CLI owns fetch, math, charts, brief. Parse intent → run CLI → narrate from **stdout JSON** + `brief.md` only.

## Invoke

Set once, then use **`$CLI` on every call** (absolute path — do not rely on cwd / `npx` / `npm`):

```bash
CLI="$HOME/.agents/skills/wiki-stats/scripts/cli.js"   # else: …/scripts/cli.js next to this SKILL.md
OUT="<workspace>/wiki-stats-output"                    # no workspace → "$HOME/Documents/wiki-stats-output"
mkdir -p "$OUT"
test -f "$CLI" || { echo "CLI missing: $CLI"; exit 1; }

node "$CLI" estimate --langs uk,de --months 24
node "$CLI" run --topic "U2" --langs uk,de --months 24 --out "$OUT"
```

Always `--out "$OUT"` on `run`. No `npm install`. No `npx` (wrong cwd → registry 404).

**Sandbox / network:** `estimate` is offline. Before **`run`**, tell the user to approve the shell command **without Sandbox** (e.g. Cursor **Allowlist**, not “with Sandbox” / not “Run Everything”). CLI only does read-only HTTPS to Wikipedia/Wikimedia + writes under `$OUT` / `~/.cache/wiki-stats` — safe for this skill. Sandboxed runs usually fail with `http_status: 0` / `Network unreachable`; then ask once to re-approve without sandbox and retry the same command (do not change the topic).

## Hard rules

- Cite numbers only from CLI stdout / `brief.md`. No invented stats; no raw time-series in chat.
- Prefer CLI Mermaid (`brief.md` / `paths.relations_mmd`).
- Confirm **only** on `needs_confirmation` (exit 3): candidates once → `--title lang:Article`. No resolve loops.
- Surface `caveats[]` / brief limitations (pageviews ≠ willingness to pay).
- **Topic unclear → ask; do not `run` until unambiguous.**
- Errors → [references/aqs.md](references/aqs.md). Metrics → [references/metrics.md](references/metrics.md).

## Workflow

1. **Parse** topic, langs (**default `uk,en`**; **`uk` not `ua`**), window (default **24** months).
2. **`estimate`** (alert = **lang count**, not months):

   ```bash
   node "$CLI" estimate --langs uk,en --months 24
   ```

   `estimation` = expected wall-clock for paced public Wikimedia API calls — not report length. Phrase `alert` once: Brief→«трошки почекати», Moderate→«доведеться чекати», Extended→«довго чекати», Infinite→«не дочекаємось» + **ask before** `run`.
   **Do not sleep or pad waits.** Let `run` block until it finishes (~`estimation` seconds). No extra +30s / 2× padding in chat.

3. **`run`** once (clear topic; always `--out`):

   ```bash
   node "$CLI" run --topic "…" --langs uk,en --months 24 --out "$OUT"
   ```

   Non-Latin → `--pivot <lang>`. Known article → `--title lang:Article`.

4. Reply from summary + `paths.brief`: answer → Mermaid if useful → 3 takeaways → caveats → artifact paths.

Default: **`run` only**. Stdout = JSON.

## Gotchas

- `missing_langlink` ≠ zero demand — don’t invent that lang’s stats.
- `--pivot` = search wiki; `--langs` = langlinks. Never `--pivot lang:Title`.
- ≥5 langs → expect `alert: Brief`.
