## Summary 

Building a B2C market intelligence skill powered by Wikipedia pageview data requires balancing deep analytical capabilities with strict execution constraints: optimizing for fast, lightweight LLMs (like Claude Haiku or free OpenRouter models) and delivering a working, reproducible pipeline within a 3-hour sprint.

Below is an evaluation of maximum feature sophistication against real-world feasibility in 3 hours, followed by a concrete architectural blueprint for your MVP.


### Sophistication Vision vs. 3-Hour Feasibility

| Feature / Domain            | Advanced Vision (Unleashed Idea)                                                                                                                                  | 3-Hour Feasibility Evaluation                                                                                                                             | MVP Scope Choice                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Language Market Demand**  | Cross-analyze 15+ Wikipedia language editions; normalize pageviews by total per-project language traffic to compute relative interest density per country/locale. | **Feasible (40 mins)**: Fetch views for top 5–7 target languages (`en`, `es`, `de`, `fr`, `ja`, `pt`, `uk`), calculate language distribution percentages. | **Included**: Direct API queries across target Wikipedia language codes.  |
| **Trend & Growth Dynamics** | Time-series forecasting (Prophet/Holt-Winters), seasonal decomposition, YoY/MoM growth acceleration rates, anomaly/spike detection via Z-scores.                  | **Feasible (35 mins)**: Simple rolling average (7-day/30-day), MoM baseline growth percentage calculation, and peak day identification.                   | **Included**: MoM growth % + rolling trend line calculations.             |
| **Topic & Niche Discovery** | Automatic topic expansion using Wikidata graph relationships, category tree traversal, and semantic similarity to discover related product niches.                | **High Risk**: Unpredictable API response times and graph parsing overhead will consume too much debugging time.                                          | **Excluded**: Agent passes candidate topic keywords directly to the tool. |
| **Data Visualization**      | Interactive HTML dashboard + multi-panel polished Seaborn graphs with customized color palettes matching founder branding.                                        | **Feasible (35 mins)**: Static 2-chart image generation using `matplotlib` (Language distribution pie/bar chart + 12-month traffic trend line).           | **Included**: Export clean PNGs directly into the report folder.          |
| **Executive PDF Export**    | Multi-page PDF report with dynamic typography, table of contents, and automatic page-break management.                                                            | **Feasible (40 mins)**: Strict 1-page HTML layout using `jinja2` converted to PDF via `weasyprint`, `pdfkit`/`wkhtmltopdf`, or `typst`.                   | **Included**: Rigid 1-page A4 template with embedded charts & metrics.    |
| **Agent Optimization**      | Autonomous multi-step tool calls with back-and-forth data refinement loops.                                                                                       | **High Risk for Haiku**: Lightweight models struggle with multi-turn complex state.                                                                       | **Shifted**: Offload heavy work to single-shot CLI script execution.      |

---

### Key Architectural Strategy for Lightweight Models (Haiku / Free Models)

To make the skill run reliably on lightweight models:

1. **Never pass raw JSON time-series data to the LLM context window.** Fetching 365 days of pageviews across 5 languages yields thousands of raw data points, consuming context budget and causing parsing errors on smaller models.


2. **Deterministic Python CLI Worker:** The Python script fetches API data, calculates metrics, renders charts, builds the PDF, and outputs a concise JSON summary (e.g., total views, top growing language, spike dates) back to the LLM agent.


3. **LLM as the Strategist:** The agent only needs to parse the user's intent, run the CLI tool, read the clean JSON summary, and synthesize a high-level executive commentary.

---

### Proposed Directory Structure (`Agent Skills` Spec)

According to the specification, all code and instructions must reside in a single self-contained directory:

```text
wikipedia-market-insights/
├── SKILL.md                 # Agent skill declaration & system instructions
├── requirements.txt         # Dependencies (requests, matplotlib, jinja2, weasyprint/typst)
├── scripts/
│   ├── fetch_analytics.py   # Queries Wikimedia API & processes stats
│   └── generate_pdf.py      # Generates HTML/PDF executive report
└── templates/
    └── report_template.html # 1-page A4 HTML/CSS design

```

---

### Step-by-Step 3-Hour Implementation Plan

#### Hour 1: Data Engine & Wikimedia API (`fetch_analytics.py`)

* Query Wikimedia Analytics Pageview API:
`GET /metrics/pageviews/per-article/{project}/{access}/{agent}/{article}/{granularity}/{start}/{end}`


* Implement a helper class to fetch historical daily views over 12 months for a list of Wikipedia project languages (e.g., `en.wikipedia`, `de.wikipedia`, `es.wikipedia`).


* Calculate key product metrics:
* Total Annual Traffic & Monthly Active Demand.
* Share of Traffic per Language/Locale (helps founders choose launch languages).


* Growth Slope: Compare traffic of the last 30 days vs. baseline 30 days 12 months ago.


* Output JSON summary to `stdout` for the agent.

#### Hour 2: Visualizations & 1-Page Executive PDF (`generate_pdf.py`)

* **Charts:** Use `matplotlib` with a modern dark/light minimalist theme:
* Chart 1: **Language Demand Split** (Horizontal Bar Chart).
* Chart 2: **Traffic Trend & Growth Velocity** (12-Month Line Chart with 30-day moving average).


* **PDF Generation:**
* Create a single-page HTML template using `Jinja2` with fixed CSS dimensions (`width: 210mm; height: 297mm; overflow: hidden;`).
* Layout sections: **Header** (Topic Name & Target Audience), **Metrics Grid** (Total Views, Top Language, Growth Rate), **Charts Side-by-Side**, and **Strategic Agent Insights**.
* Render to PDF using `weasyprint` (or `typst` CLI / `xhtml2pdf` / `playwright`).



#### Hour 3: `SKILL.md` Writing, Agent Prompting & Validation

* Draft `SKILL.md` following the specification:


* `name`: `wikipedia-b2c-market-analyzer`
* `description`: Instructions for when the agent should trigger this skill (e.g., "When founders want to evaluate B2C product niche demand or language expansion options").
* `instructions`: Direct guidelines telling the agent how to invoke `python scripts/fetch_analytics.py --topic <keyword> --langs en,es,de,ja` and how to present the generated PDF report link.


* **Testing:** Run end-to-end tests using Claude 3.5/4.5 Haiku or free OpenRouter models to ensure the tool call succeeds deterministically without hitting token limits or parsing timeouts.



---

### Single-Page PDF Design Blueprint

To guarantee the PDF fits cleanly on one page:

* **KPI Cards (Top Bar):** 3 core numbers — Total 12M Searches, Top Language Market Share %, YoY Growth Trend.
* **Visual Grid (Middle):** Two 400x250px PNG charts placed side by side.
* **Strategic Takeaways (Bottom):** 3 bullet points populated by the agent:
1. *Language Expansion Priority*: Primary language markets to localize into.
2. *Market Momentum*: Evergreen vs. seasonal trend warning.
3. *Action Item*: Recommendation for product launch timing.