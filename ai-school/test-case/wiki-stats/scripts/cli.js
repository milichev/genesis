#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTopic } from './resolve.js';
import { fetchArticles } from './fetch.js';
import { analyzePageviews, buildSummary } from './analyze.js';
import { writeCharts } from './chart.js';
import { writeBrief } from './brief.js';
import { SKILL_ROOT } from './lib/cache.js';
import { setLogSink, HttpError } from './lib/http.js';
import { computeEstimate } from './lib/estimate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function usage() {
  return `wiki-stats — Wikipedia pageview analysis CLI

Usage:
  wiki-stats estimate --langs pl,cs,uk [--months 24]
  wiki-stats resolve --topic <q> [--langs pl,cs] [--title en:Foo]
  wiki-stats fetch --input <resolve.json> [--months 24]
  wiki-stats analyze --input <fetch.json>
  wiki-stats chart --input <fetch.json> --analysis <analyze.json> --out <dir>
  wiki-stats brief --resolve <resolve.json> --fetch <fetch.json> --analysis <analyze.json> --out <dir>
  wiki-stats run --topic <q> [--langs pl,cs] [--months 24] [--pivot en]
      [--title en:Foo] [--start YYYYMM|YYYYMMDD] [--end YYYYMM|YYYYMMDD] [--out dir]

Global:
  --help           Show help
  --log=<file>     Append paced HTTP log (timestamp, method, URL, status, ms, wait_ms, cache)

Exit codes: 0 ok · 1 error · 2 usage · 3 needs_confirmation (resolve/run)
`;
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
      continue;
    }
    if (a.startsWith('--')) {
      let key = a.slice(2);
      let val;
      const eq = key.indexOf('=');
      if (eq !== -1) {
        val = key.slice(eq + 1);
        key = key.slice(0, eq);
        out[key] = val;
        continue;
      }
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

function parseLangs(raw) {
  if (!raw) return ['en'];
  return String(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function printJsonError(err) {
  /** @type {Record<string, unknown>} */
  const payload = {
    status: 'error',
    error: String(err?.message || err),
  };
  if (err instanceof HttpError) {
    payload.http_status = err.status;
  }
  console.log(JSON.stringify(payload));
}

async function readJsonFile(p) {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return JSON.parse(await fs.readFile(abs, 'utf8'));
}

async function cmdEstimate(args) {
  const langs = parseLangs(args.langs || 'en');
  const result = computeEstimate(langs);
  console.log(JSON.stringify(result));
}

async function cmdResolve(args) {
  if (!args.topic && !args.title) {
    console.error('resolve requires --topic or --title');
    process.exit(2);
  }
  const result = await resolveTopic({
    topic: args.topic || args.title,
    langs: parseLangs(args.langs || 'en'),
    pivotLang: args.pivot,
    title: args.title,
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'needs_confirmation') process.exit(3);
  if (result.status === 'error') process.exit(1);
}

async function cmdFetch(args) {
  const input = args.input
    ? await readJsonFile(args.input)
    : JSON.parse(await readStdin());
  const articles = input.articles || input;
  const result = await fetchArticles({
    articles,
    months: args.months ? Number(args.months) : undefined,
    start: args.start,
    end: args.end,
    granularity: args.granularity,
  });
  console.log(JSON.stringify(result, null, 2));
}

async function cmdAnalyze(args) {
  const fetchBundle = args.input
    ? await readJsonFile(args.input)
    : JSON.parse(await readStdin());
  const analysis = analyzePageviews(fetchBundle.articles, fetchBundle.window);
  console.log(JSON.stringify(analysis, null, 2));
}

async function cmdChart(args) {
  const fetchBundle = await readJsonFile(args.input);
  const analysis = args.analysis
    ? await readJsonFile(args.analysis)
    : analyzePageviews(fetchBundle.articles, fetchBundle.window);
  const outDir = path.resolve(
    args.out || path.join(SKILL_ROOT, 'output', 'charts')
  );
  const paths = await writeCharts(
    analysis.per_lang,
    fetchBundle.articles,
    fetchBundle.window,
    outDir
  );
  console.log(JSON.stringify(paths, null, 2));
}

async function cmdBrief(args) {
  const resolveResult = await readJsonFile(args.resolve);
  const fetchBundle = await readJsonFile(args.fetch);
  const analysis = args.analysis
    ? await readJsonFile(args.analysis)
    : analyzePageviews(fetchBundle.articles, fetchBundle.window);
  const chartPaths = args.charts
    ? await readJsonFile(args.charts)
    : await writeCharts(
        analysis.per_lang,
        fetchBundle.articles,
        fetchBundle.window,
        path.join(path.resolve(args.out), 'charts')
      );
  const outDir = path.resolve(
    args.out || path.join(SKILL_ROOT, 'output', 'brief')
  );
  const paths = await writeBrief(
    resolveResult,
    fetchBundle,
    analysis,
    chartPaths,
    outDir
  );
  console.log(JSON.stringify(paths, null, 2));
}

function hasUsableSeries(fetchBundle) {
  return fetchBundle.articles.some((a) => a.series && a.series.length > 0);
}

async function cmdRun(args) {
  if (!args.topic && !args.title) {
    console.error('run requires --topic');
    process.exit(2);
  }
  const langs = parseLangs(args.langs || 'en');
  const eta = computeEstimate(langs);

  const resolveResult = await resolveTopic({
    topic: args.topic || args.title,
    langs,
    title: args.title,
    pivotLang: args.pivot,
  });

  if (resolveResult.status === 'needs_confirmation') {
    console.log(
      JSON.stringify({
        status: 'needs_confirmation',
        query: resolveResult.query,
        pivot_lang: resolveResult.pivot_lang,
        candidates: resolveResult.candidates,
        reason: resolveResult.reason,
      })
    );
    process.exit(3);
  }
  if (resolveResult.status === 'error') {
    console.log(
      JSON.stringify({
        status: 'error',
        error: resolveResult.error,
        http_status: resolveResult.http_status,
      })
    );
    process.exit(1);
  }

  const slug = String(resolveResult.topic)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 48);
  const outDir = path.resolve(
    args.out || path.join(SKILL_ROOT, 'output', `${slug}-${Date.now()}`)
  );

  const fetchBundle = await fetchArticles({
    articles: resolveResult.articles,
    months: args.months ? Number(args.months) : 24,
    start: args.start,
    end: args.end,
    granularity: args.granularity,
  });

  if (!hasUsableSeries(fetchBundle)) {
    console.log(
      JSON.stringify({
        status: 'error',
        error: 'No pageview series available for any language',
        topic: resolveResult.topic,
        fetch_errors: fetchBundle.errors,
        articles: resolveResult.articles.map((a) => ({
          lang: a.lang,
          status: a.status,
          url: a.url ?? null,
        })),
      })
    );
    process.exit(1);
  }

  const articlesForAnalyze = fetchBundle.articles.map((a) => {
    const meta = resolveResult.articles.find((r) => r.lang === a.lang);
    let status = meta?.status;
    if (a.fetch_error) status = 'fetch_error';
    return { ...a, status };
  });

  const analysis = analyzePageviews(articlesForAnalyze, fetchBundle.window);

  if (fetchBundle.errors?.length) {
    analysis.caveats.push(
      `AQS fetch failed for: ${fetchBundle.errors.map((e) => e.lang).join(', ')} — partial results only.`
    );
  }
  if (resolveResult.langlink_error) {
    analysis.caveats.push(
      `Langlinks unavailable (${resolveResult.langlink_error}); non-pivot languages may be skipped.`
    );
  }

  const chartDir = path.join(outDir, 'charts');
  const chartPaths = await writeCharts(
    analysis.per_lang,
    fetchBundle.articles,
    fetchBundle.window,
    chartDir
  );
  const briefPaths = await writeBrief(
    resolveResult,
    fetchBundle,
    analysis,
    chartPaths,
    outDir
  );

  const summary = buildSummary(
    resolveResult,
    fetchBundle,
    analysis,
    {
      out_dir: outDir,
      brief: briefPaths.brief,
      relations_mmd: briefPaths.relations,
      chart_lang_share: chartPaths.lang_share,
      chart_trend: chartPaths.trend,
    },
    {
      estimation: eta.estimation,
      alert: eta.alert,
    }
  );

  if (fetchBundle.errors?.length) {
    summary.fetch_errors = fetchBundle.errors;
  }

  console.log(JSON.stringify(summary));
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  const cmd = args._[0];

  if (args.log) {
    setLogSink(String(args.log));
  }

  if (args.help || !cmd) {
    process.stdout.write(usage());
    process.exit(cmd ? 0 : 2);
  }

  try {
    switch (cmd) {
      case 'estimate':
        await cmdEstimate(args);
        break;
      case 'resolve':
        await cmdResolve(args);
        break;
      case 'fetch':
        await cmdFetch(args);
        break;
      case 'analyze':
        await cmdAnalyze(args);
        break;
      case 'chart':
        await cmdChart(args);
        break;
      case 'brief':
        await cmdBrief(args);
        break;
      case 'run':
        await cmdRun(args);
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        process.stdout.write(usage());
        process.exit(2);
    }
  } catch (err) {
    console.error(String(err.stack || err));
    printJsonError(err);
    process.exit(1);
  }
}

main();
