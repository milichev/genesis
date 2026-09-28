# wiki-stats — захист case study

Завдання: [pes_task_1.md](pes_task_1.md). Скіл: [wiki-stats/](wiki-stats/).

## Короткий виклад

B2C-засновникам потрібен сигнал «куди інвестувати далі» (тема / мова). Навичка `wiki-stats` бере Wikipedia pageviews (Wikimedia AQS), рахує частки й YoY-зростання, пише `brief.md` + SVG + Mermaid і віддає агенту компактний JSON.

**CLI = worker** (fetch, метрики, графіки, brief). **LLM = strategist** (розбір запиту → один `run` → наратив з summary/brief). Pageviews ≠ готовність платити — caveats завжди в артефактах.

## Пріоритети

**Імплементація.** `SKILL.md` тримає дешеву tool-модель у руслі: one-shot CLI, без вигаданих чисел і сирих time-series у чаті, confirm лише на `needs_confirmation`. Валідація мов/`--pivot` і пороги `estimate` — у CLI, не в промпті.

**Продукт.** Вартісний для фаундера brief (KPI → карта тем → charts → takeaways → limitations) і прийнятний UX: `estimate` попереджає про очікування, `run` дає артефакти за один прогін.

## Descoped in advance

Не MVP (і свідомо не робились): PDF «на одну сторінку», polish UI/dashboard, skill state machine (`next-move` — наступна велика ставка). Також пізніше: Wikidata Mermaid, relative interest, автораннер evals.

Деталі й non-goals: [wiki-stats/references/roadmap.md](wiki-stats/references/roadmap.md). Pre-inception brainstorm (не опис поставленого): [vision-pre-inception.md](vision-pre-inception.md). Плани фаз: `[.cursor/plans/](../../.cursor/plans/)`.

## Огляд реалізації

`scripts/cli.js` оркеструє пайплайн: `resolve.js` (OpenSearch + langlinks) → `fetch.js` (AQS) → `analyze.js` (KPI/shares/growth/spikes) → `chart.js` (SVG) → `brief.js` (Markdown + Mermaid). Підтримка в `lib/`: `aqs.js`, `mediawiki.js`, `cache.js`, `estimate.js`, `langs.js`, `http.js` (pacer/retry). Стек: Node 20+ ESM, нуль runtime-deps (`fetch`).

```
wiki-stats — Wikipedia pageview analysis CLI

Usage:
  wiki-stats estimate --langs pl,cs,uk [--months 24]
  wiki-stats resolve --topic <q> [--langs pl,cs] [--title en:Foo]
  wiki-stats fetch --input <resolve.json> [--months 24]
  wiki-stats analyze --input <fetch.json>
  wiki-stats chart --input <fetch.json> --analysis <analyze.json> --out <dir>
  wiki-stats brief --resolve <resolve.json> --fetch <fetch.json> --analysis <analyze.json> --out <dir>
  wiki-stats run --topic <q> [--langs pl,cs] [--months 24] [--pivot en]
      [--title en:Foo] [--start YYYYMM|YYYYMMDD] [--end YYYYMM|YYYYMMDD] [--out dir]
```

| Команда    | Що робить                                                  |
| ---------- | ---------------------------------------------------------- |
| `estimate` | Без мережі: оцінка часу запитів і `alert` за кількістю мов |
| `resolve`  | Тема → статті по мовах (або `--title`)                     |
| `fetch`    | Pageviews з AQS у кеш/JSON                                 |
| `analyze`  | Метрики, spikes, caveats, summary-поля                     |
| `chart`    | Два SVG (share + trend)                                    |
| `brief`    | `brief.md` + `relations.mmd` за шаблоном                   |
| `run`      | One-shot: resolve→…→brief; stdout = малий JSON             |

Артефакти (`output/`): KPI strip → Mermaid (resolution + audience) → 2× SVG → takeaways → Assumptions & limitations — див. [assets/brief-template.md](wiki-stats/assets/brief-template.md).

## Installation

```bash
npx skills add https://github.com/<owner>/<repo>/tree/main/ai-school/test-case/wiki-stats -g -a cursor -y
```

Нуль npm-залежностей — `npm install` не потрібен. Як агент має викликати CLI: [wiki-stats/SKILL.md](wiki-stats/SKILL.md).

## Usage

**Чат** (Haiku-class / аналог з tools), скіл установлений:

- _Порівняй інтерес до intermittent fasting у pl та cs Wikipedia за 24 місяці — куди локалізувати курс першим?_
- _Чи зростає інтерес до групи «нірвана» в uk та de Wikipedia? (нелатиниця — агент має взяти_ `--pivot uk`_)_
- _Використовуючи /wiki-stats, оціни, скільки займе підготовка звіту за 8 будь-якими мовами протягом 6 років_ — лише `estimate`; час = rate limit API; без теми — не `run`.
- _/wiki-stats Чи зростає інтерес до групи «U2» в uk та de Wikipedia?_

Очікування: неясна тема → перепитати; default langs `uk,en`; `estimate` → один `run` → summary/`brief.md`. Перед `run` агент просить approve **без Sandbox** (Allowlist ок; “with Sandbox” майже завжди дає `http_status: 0`) — CLI лише HTTPS до Wikimedia + запис у `$OUT` / `~/.cache/wiki-stats`. Контракт: [SKILL.md](wiki-stats/SKILL.md).

## Uninstallation

```bash
npx skills remove wiki-stats -g
```

## Development & Distribution

Окремого registry publish немає: дистрибуція = git tree URL або локальна тека + [skills CLI](https://github.com/vercel-labs/skills).

Локальний install:

```bash
npx skills add /absolute/path/to/genesis/ai-school/test-case/wiki-stats -g -a cursor -y
```

Термінал (`run` завжди з `--out`; без `npx` — absolute `node`):

```bash
CLI="$HOME/.agents/skills/wiki-stats/scripts/cli.js"
OUT="<workspace>/wiki-stats-output"    # без workspace → ~/Documents/wiki-stats-output
node "$CLI" estimate --langs pl,cs --months 24
node "$CLI" run --topic "intermittent fasting" --langs pl,cs --months 24 --out "$OUT"
```

Тести (без мережі):

```bash
cd wiki-stats && npm test
```

Метрики / AQS: [references/metrics.md](wiki-stats/references/metrics.md), [references/aqs.md](wiki-stats/references/aqs.md).

## Верифікація

Під час розробки:

1. `npm test` — fail-fast langs, estimate alert bands, omit-null articles, Mermaid `href` (див. `wiki-stats/test/`).
2. **Ручний smoke CLI** — `estimate` / `run` на демо-топіках вище.
3. **Ручний agent smoke** на дешевій моделі: промпти з gotchas у `SKILL.md` і кейси в [wiki-stats/evals/evals.json](wiki-stats/evals/evals.json).

Автораннера agent-evals **немає**: `evals.json` — каталог промптів + assertions для ручної перевірки. Повний eval loop — у roadmap §5.

Очікуване використання: користувач у чаті формулює дослідницьке питання; агент викликає CLI; ділиться висновками й шляхами до артефактів.

## Known issues & learnings

- Українська вікі = код `uk`, не `ua` (CLI відхиляє до HTTP).
- `missing_langlink` — прогалина в даних, не «нульовий попит»; не вигадувати статистику для відсутньої мови.
- Нелатиниця / неоднозначність: `--pivot` для пошуку, `--title lang:Article` щоб обійти resolve; `--pivot en:Title` невалідний.

Більше: [LEARNINGS.md](LEARNINGS.md).

## Roadmap

Наступна ставка — agent↔CLI state machine (`next-move`). Далі PDF, Wikidata, relative interest, eval runner: [wiki-stats/references/roadmap.md](wiki-stats/references/roadmap.md).
