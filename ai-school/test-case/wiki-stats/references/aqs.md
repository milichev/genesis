# Wikimedia Analytics (AQS) & MediaWiki gotchas

Use this when `fetch` / `run` fails, returns empty series, or resolve behaves oddly.

## Endpoints (MVP)

**Pageviews (AQS)**

```http
GET https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}
```

- **`project`**: `{lang}.wikipedia` (e.g. `pl.wikipedia`, `uk.wikipedia`) — not bare `pl` or `wikipedia`.
- **`access`**: MVP uses `all-access`.
- **`agent`**: MVP uses `user` (human views, excludes bots). Do not confuse with HTTP User-Agent (below).
- **`article`**: URL-encoded title; spaces → underscores; no leading `:` namespace.
- **`granularity`**: `monthly` for multi-month windows; `daily` when window ≤ ~90 days.
- **`start` / `end`**: `YYYYMMDD` for daily, `YYYYMM` for monthly (AQS conventions).

**Resolve (MediaWiki Action API)**

- Search + redirects on pivot wiki (query language or `en`).
- `langlinks` to target languages; missing link = `missing_langlink` in resolve output, **no AQS fetch** for that lang. Use `--title pl:…` when you know the local article (CLI does not search target wikis as a fallback in MVP).

Official reference: [Pageviews API](https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/reference/page-views.html).

## Article title encoding

1. Use the **canonical article name** after resolve (same as in the page URL path).
2. **Percent-encode** for the AQS path segment (`encodeURIComponent` on the title; keep underscores).
3. Unicode titles (e.g. Ukrainian) must be UTF-8 encoded in the URL, not transliterated.
4. Redirects: resolve should follow to the stored title before fetch; fetching a redirect name can 404 or return empty.

## HTTP User-Agent (required)

Wikimedia requires an **identifying** User-Agent string (app name, contact URL or email). Generic library defaults may be blocked.

- Override with env **`WIKI_STATS_UA`**. Required shape: `wiki-stats/0.1 (https://…; email@…)` — app name, project URL, contact email.
- Default in code: `wiki-stats/0.1.0 (https://github.com/genesis/ai-school; contact@example.com)`.
- If you see **403** or “please set User-Agent”, set `WIKI_STATS_UA` before retrying.

## Global pacer & retries (CLI)

The shared HTTP client (`scripts/lib/http.js`) applies:

- **One in-flight request** per process (safest under Wikimedia “≤3 concurrent” guidance).
- **Minimum 350ms** between request starts (~170 req/min, under the ~200/min UA-only cap).
- **429 / 503:** honor `Retry-After` (seconds or HTTP-date); if absent, wait **≥5s**; exponential backoff; **~5 attempts** per URL.
- After retries: throws typed **`HttpError`** `{ status, retryable, url }`. Resolve/fetch mark per-lang failures and continue when possible; CLI stdout stays JSON on fatal errors.

Optional **`--log=<file>`** appends one line per paced request (or cache hit from AQS): ISO time, method, URL, status/error, duration ms, pacer `wait_ms`, `cache=hit|miss`.

## Rate limits & cache

- Public APIs are shared: the pacer + backoff above replace ad-hoc agent retries.
- **Cache** responses under `.cache/` (gitignored); re-runs with the same project/title/range should hit disk.
- Prefer **`run` once** per user question rather than many parallel fetches from the agent.
- Run **`wiki-stats estimate`** before long multi-lang jobs; 429 storms can exceed the cold-path estimate.

## Common failure modes

| Symptom                    | Likely cause                                                                | Action                                                           |
| -------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 404 on pageviews           | Wrong project slug, wrong encoded title, or deleted page                    | Re-run `resolve`; verify `lang.wikipedia`                        |
| Empty series               | Title mismatch, range before page existed, or granularity/date format wrong | Check start/end format; widen window                             |
| Wildly low views           | Used `agent=spider` vs `user`, or wrong article                             | Confirm `user` agent segment                                     |
| Resolve picks wrong topic  | Ambiguous search                                                            | Wait for `needs_confirmation`; user picks `--title`              |
| stdout `status: "partial"` | Some langs failed AQS after retries                                         | Read `fetch_errors` and `caveats[]`; do not invent missing langs |

## `project` vs language code

- CLI flags use short langs: `--langs pl,cs,uk`.
- AQS paths use **`pl.wikipedia`**, not `plwiki` or `pl`.
