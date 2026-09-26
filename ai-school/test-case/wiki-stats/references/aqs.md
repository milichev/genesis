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

- Set a stable UA in the CLI HTTP client (e.g. `wiki-stats/0.1 (Agent Skills case study; contact: …)`).
- If you see **403** or “please set User-Agent”, fix UA before retrying.

## Rate limits & retries

- Public APIs are shared: **back off** on 429 / 503; avoid hammering the same article in a tight loop.
- **Cache** responses under `.cache/` (gitignored); re-runs with the same project/title/range should hit disk.
- Prefer **`run` once** per user question rather than many parallel fetches from the agent.

## Common failure modes

| Symptom | Likely cause | Action |
| --- | --- | --- |
| 404 on pageviews | Wrong project slug, wrong encoded title, or deleted page | Re-run `resolve`; verify `lang.wikipedia` |
| Empty series | Title mismatch, range before page existed, or granularity/date format wrong | Check start/end format; widen window |
| Wildly low views | Used `agent=spider` vs `user`, or wrong article | Confirm `user` agent segment |
| Resolve picks wrong topic | Ambiguous search | Wait for `needs_confirmation`; user picks `--title` |

## `project` vs language code

- CLI flags use short langs: `--langs pl,cs,uk`.
- AQS paths use **`pl.wikipedia`**, not `plwiki` or `pl`.
