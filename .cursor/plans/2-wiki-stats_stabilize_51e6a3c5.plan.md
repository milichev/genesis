---
name: wiki-stats stabilize
overview: 'Stabilize wiki-stats: restore-confirmed codebase, harden Wikimedia HTTP (pacer + soft failures), add estimate/eta UX for agents, --log, articles[*].url, and publish/install docs + local e2e.'
todos:
  - id: http-pacer
    content: Global pacer + Retry-After + soft HttpError in http.js; partial continue in resolve/fetch
    status: completed
  - id: cli-json-errors
    content: CLI always emits JSON on failure; never uncaught 429 stack
    status: completed
  - id: estimate-eta
    content: CLI `estimate` returns estimation + optional alert enum; SKILL only relays alert; run may echo same fields
    status: completed
  - id: log-flag
    content: Add --log=<file> request/pacer logging
    status: completed
  - id: articles-url
    content: Add articles[*].url to resolve + summary schema/docs
    status: completed
  - id: publish-docs-e2e
    content: references/publish.md + local npx skills add e2e check
    status: completed
isProject: false
---

# wiki-stats stabilization phase

## Locked decisions (grill)

- **Working tree:** restored from git; aux docs already committed. Stabilize builds on that code (no rewrite).
- **Long-run UX:** reject background+poll (C). Ship **`wiki-stats estimate`** (no network). CLI returns `{ estimation, alert? }` — **CLI decides severity**; agent never thresholds numbers. SKILL: if `alert` is present, warn the user using the mapped phrase for that enum, then call `run`. Tool wait/block_until ≥ `estimation` + documented margin. Optionally `run` echoes the same `estimation`/`alert` (B-lite).
- **Partial failure (locked):** after retries, one lang’s resolve/fetch error → mark that article (`fetch_error` / resolve error), **continue** other langs. If ≥1 series exists → `status: "ok"` (or a clear `partial` if already used) + caveats listing failures; deliver charts/brief on what succeeded. Total abort only when **nothing** usable remains. `missing_langlink` stays a data gap, not an error.
- **`alert` buckets (locked):** omit when `estimation` &lt; 10; `Brief` 10–29; `Moderate` 30–89; `Extended` 90–299; `Infinite` ≥ 300 (or absurd `requests_est`, e.g. ≥ 50 langs). Phrase bank in SKILL: Brief → трошки почекати; Moderate → доведеться чекати; Extended → довго чекати; Infinite → безкінечність, скоріш за все, не дочекаємось (+ ask before `run`).

---

## 1. Publishing / e2e install (answer + deliverable)

**There is no “Publish” button on [skills.sh](https://www.skills.sh/).** The directory is a leaderboard over installs. Distribution is: put a valid skill on a git host (or local path), then install with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
# Local e2e (no GitHub required)
npx skills add ~/Dev/genesis/ai-school/test-case/wiki-stats -g -a cursor -y

# After the skill lives in a public GitHub repo
npx skills add <owner>/<repo> -g -a cursor -y
# or path into a monorepo:
npx skills add https://github.com/<owner>/<repo>/tree/main/ai-school/test-case/wiki-stats
```

Discovery expects `SKILL.md` at repo root **or** under known containers (`skills/`, `.agents/skills/`, etc.). Our layout (skill at folder root with `SKILL.md`) already works for `skills add <path-or-tree-url>`.

**Plan work:**

- Add `[references/publish.md](genesis/ai-school/test-case/wiki-stats/references/publish.md)`: local install, GitHub install, Cursor global path (`~/.cursor/skills/`), badge optional, note that skills.sh ranking follows installs not a separate publish API.
- Link it from `[SKILL.md](genesis/ai-school/test-case/wiki-stats/SKILL.md)` (one line).
- E2E check after code fixes: `npx skills add <abs-path> -g -a cursor -y` then confirm skill appears; run one `wiki-stats run` from the installed copy’s directory (or document that CLI is invoked from skill root after install).

**Default for this sprint:** local path install for e2e. Pushing to a specific GitHub remote is out of scope unless you already have a public repo URL ready.

---

## 2. Rate limits + never crash the flow

**Root cause today.** `[scripts/lib/http.js](genesis/ai-school/test-case/wiki-stats/scripts/lib/http.js)` treats 429 like a hard error: after retries it `throw`s; `[cli.js](genesis/ai-school/test-case/wiki-stats/scripts/cli.js)` does not catch → process dumps a stack (terminal 15). Also no global pacing / `Retry-After` parsing; concurrent bursts from resolve+fetch trip [Wikimedia rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) (UA-only ≈ **200 req/min**, recommend **≤3 concurrent**, meaningful UA + contact).

```mermaid
flowchart TD
  call[fetchJson] --> queue[Global pacer queue]
  queue --> waitMin[Min spacing ~350ms]
  waitMin --> req[HTTP request]
  req -->|2xx| ok[Return JSON]
  req -->|429/503| backoff[Honor Retry-After or 5s+]
  backoff --> retry[Retry up to N]
  retry -->|exhausted| soft[SoftFail object]
  soft --> continue[Caller continues / partial summary]
```

**Implement in `http.js` (shared):**

- **Compliant UA** via `WIKI_STATS_UA` (document required shape: `wiki-stats/0.1 (https://…; email@…)`). Keep a non-placeholder default that still identifies the skill.
- **Global pacer:** single in-process queue; max **1 in flight** for MVP simplicity (safest under “≤3 concurrent”; easy to raise to 2 later); minimum **350ms** between request starts (~170/min headroom under 200).
- **429/503:** read `Retry-After` (seconds or HTTP-date); else wait ≥5s; exponential backoff; more attempts (e.g. 5).
- **Return shape:** either success JSON **or** throw a typed `HttpError` with `{ status, retryable, url }` — callers decide.

**Soft-fail the CLI (critical):**

- Wrap `main` / `cmdRun` in try/catch: always print **one JSON object** to stdout on failure (`{ "status": "error", "error": "…", "http_status": 429 }`), diagnostics to stderr; exit 1 — **never** an uncaught stack as the primary UX.
- In `resolve` / `fetch`: if a single MediaWiki/AQS call soft-fails after retries, mark that article (`status: "fetch_error"` / resolve error field) and **continue** other langs when possible. Prefer partial delivery with caveats over total abort when at least one series exists (**locked**).
- Update `[references/aqs.md](genesis/ai-school/test-case/wiki-stats/references/aqs.md)` with pacer + Retry-After + UA policy.

**Note:** typo `ua` in `--langs` (Ukrainian is `uk`) is user error; optional one-line gotcha in SKILL.md only.

---

## 3. `estimate` + CLI-owned `alert` (new)

**Yes — agent must not decide.** Severity lives in the CLI; SKILL only relays.

**CLI (no network):**

```bash
wiki-stats estimate --langs pl,cs,uk --months 24
```

Stdout JSON shape (locked):

```json
{
  "status": "ok",
  "estimation": 12,
  "alert": "Moderate",
  "requests_est": 6,
  "assumptions": { "pace_ms": 350, "resolve_requests": 3, "fetch_per_lang": 1 }
}
```

- `estimation`: wall-time seconds (number), cold-path from paced request count.
- `alert`: optional enum string — omit when no user-facing wait notice is needed (see buckets below). Values:

| `alert`    | User-facing sense (SKILL phrase bank)        |
| ---------- | -------------------------------------------- |
| `Brief`    | трошки почекати                              |
| `Moderate` | доведеться чекати                            |
| `Extended` | довго чекати                                 |
| `Infinite` | безкінечність, скоріш за все, не дочекаємось |

**Buckets (locked):**

- omit `alert` when `estimation` &lt; 10
- `Brief`: 10–29
- `Moderate`: 30–89
- `Extended`: 90–299
- `Infinite`: ≥ 300 (or absurd request_est, e.g. ≥ 50 langs)

**Formula:** `requests_est ≈ resolve_fixed + lang_count`; `estimation = ceil(requests_est * pace_ms / 1000)`. Ignore cache hits and 429 in the number; note in assumptions that 429 can extend wall time. `months`/granularity do not change request count for monthly per-article (one GET per lang) — still accepted as flags for API symmetry with `run`.

**SKILL.md agent workflow:**

1. Run `estimate` with the same `--langs` / window flags as the planned `run`.
2. **If `alert` is present:** tell the user once using the SKILL phrase for that enum (optionally include `estimation` seconds). Do not invent other severity logic.
3. Call `run` with tool wait ≥ `estimation + margin` (document margin once, e.g. `max(30, estimation)` extra or 2×). No busy-`sleep` loop.
4. On `Infinite`: still allow `run` if the user confirms, or ask before running — SKILL one-liner: ask before proceeding when `alert === "Infinite"`.
5. `run` may echo `estimation` / `alert` in the summary (B-lite).

---

## 4. `--log=<file>` request log

Global flag parsed in `[cli.js](genesis/ai-school/test-case/wiki-stats/scripts/cli.js)`, passed into `http` via module setter or `AsyncLocalStorage` / `setLogSink(path)`.

Each paced request appends one line (ISO timestamp), e.g.:
`2026-09-26T18:30:01.123Z GET https://… status=200 ms=412 cache=miss wait_ms=350`

Log: method, full URL, status (or `error`), duration, pacer wait, cache hit if fetch layer knows it (AQS cache can call `logLine` too). Create/append file; create parent dirs. Document in `--help` and SKILL.md.

---

## 5. Schema: `articles[*].url`

In `[resolve.js](genesis/ai-school/test-case/wiki-stats/scripts/resolve.js)` when building articles, and in `[analyze.js` `buildSummary](genesis/ai-school/test-case/wiki-stats/scripts/analyze.js)`:

- Linked/pivot: `url: \`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g,'_'))}` (or reuse title already underscored).
- `missing_langlink` / errors: `url: null`.

Update SKILL.md summary schema line + `evals/evals.json` field list.

---

## Implementation order (~1.5–2h)

1. `http.js` pacer + Retry-After + better retries; soft `HttpError`.
2. CLI catch-all JSON errors; fetch/resolve partial failure.
3. `estimate` subcommand (`estimation` + optional `alert` enum) + SKILL phrase bank / wait-margin / Infinite confirm.
4. `--log` wiring.
5. `articles[].url`.
6. Docs: `references/publish.md`, aqs/SKILL/evals touch-ups.
7. Verify: `estimate` then two back-to-back `run`s without crash; `--log=./output/http.log`; `npx skills add <path> -g -a cursor -y` smoke.
