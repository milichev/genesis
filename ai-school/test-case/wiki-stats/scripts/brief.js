import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILL_ROOT } from './lib/cache.js';
import { wikiArticleUrl } from './lib/mediawiki.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(SKILL_ROOT, 'assets/brief-template.md');

/**
 * @param {object} resolveResult
 * @param {object} analysis
 * @param {object} chartPaths relative or absolute
 * @param {string} outDir
 */
export async function writeBrief(
  resolveResult,
  fetchBundle,
  analysis,
  chartPaths,
  outDir
) {
  await fs.mkdir(outDir, { recursive: true });
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');

  const mermaid = buildMermaid(resolveResult, analysis);
  const relationsPath = path.join(outDir, 'relations.mmd');
  await fs.writeFile(relationsPath, mermaid.full, 'utf8');

  const relShare = path.relative(outDir, chartPaths.lang_share);
  const relTrend = path.relative(outDir, chartPaths.trend);

  const top = analysis.per_lang[0];
  const topGrowth = [...analysis.per_lang].sort(
    (a, b) => (b.growth_pct ?? -999) - (a.growth_pct ?? -999)
  )[0];

  const pivot = resolveResult.pivot;
  const vars = {
    TITLE: resolveResult.topic,
    WINDOW_START: formatWindowDate(fetchBundle.window.start),
    WINDOW_END: formatWindowDate(fetchBundle.window.end),
    GRANULARITY: fetchBundle.window.granularity,
    PIVOT_LANG: pivot?.lang ?? '—',
    PIVOT_TITLE: pivot?.title?.replace(/_/g, ' ') ?? '—',
    KPI_COMBINED: fmtNum(analysis.kpis.combined_views),
    KPI_TOP_LANG: top?.lang ?? '—',
    KPI_TOP_SHARE: top ? `${top.share_pct}%` : '—',
    KPI_TOP_GROWTH:
      topGrowth?.growth_pct != null
        ? `${topGrowth.lang} ${topGrowth.growth_pct > 0 ? '+' : ''}${topGrowth.growth_pct}%`
        : 'n/a',
    KPI_SPIKES: String(analysis.spikes.length),
    MERMAID_RESOLUTION: fence(mermaid.resolution),
    MERMAID_AUDIENCE: fence(mermaid.audience),
    CHART_SHARE_PATH: relShare,
    CHART_TREND_PATH: relTrend,
    TAKEAWAY_LANG: takeawayLang(analysis),
    TAKEAWAY_MOMENTUM: takeawayMomentum(analysis),
    TAKEAWAY_ACTION: takeawayAction(analysis, resolveResult),
    LIMITATIONS: analysis.caveats
      .filter((c) => !c.startsWith('Wikipedia pageviews measure'))
      .map((c) => `- ${c}`)
      .join('\n'),
  };

  let body = template;
  for (const [key, val] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, val);
  }

  const briefPath = path.join(outDir, 'brief.md');
  await fs.writeFile(briefPath, body, 'utf8');

  return { brief: briefPath, relations: relationsPath, mermaid };
}

function fence(block) {
  return '```mermaid\n' + block.trim() + '\n```';
}

function formatWindowDate(ymd) {
  if (!ymd || ymd.length < 8) return ymd;
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function mermaidArticleLabel(lang, title, url) {
  const plain = `${lang}:${escM(title)}`;
  if (!url) return plain;
  return `<a href='${url}'>${plain}</a>`;
}

/** @param {object} resolveResult @param {object} analysis */
export function buildMermaid(resolveResult, analysis) {
  const topicLabel = resolveResult.topic;
  const pivot = resolveResult.pivot;
  const pivotUrl =
    resolveResult.articles.find((a) => a.lang === pivot.lang)?.url ??
    wikiArticleUrl(pivot.lang, pivot.title);

  let resolution = `flowchart LR\n  topic["${escM(topicLabel)}"] --> pivot["${mermaidArticleLabel(pivot.lang, pivot.title, pivotUrl)}"]`;
  for (const a of resolveResult.articles) {
    if (a.lang === pivot.lang) continue;
    if (!a.title) {
      resolution += `\n  pivot -.-> ${a.lang}Missing["${a.lang}: missing langlink"]`;
    } else {
      const url = a.url ?? wikiArticleUrl(a.lang, a.title);
      resolution += `\n  pivot --> ${a.lang}["${mermaidArticleLabel(a.lang, a.title, url)}"]`;
    }
  }

  const ranked = [...analysis.per_lang].sort(
    (a, b) => b.share_pct - a.share_pct
  );
  let audience = 'flowchart TB\n  pivot2["Audience priority"]';
  let prev = 'pivot2';
  ranked.forEach((p, i) => {
    const node = `L${i}`;
    const growth =
      p.growth_pct != null
        ? ` | ${p.growth_pct > 0 ? '+' : ''}${p.growth_pct}%`
        : '';
    audience += `\n  ${prev} --> ${node}["${p.lang} ${p.share_pct}%${growth}"]`;
    prev = node;
  });

  return {
    resolution,
    audience,
    full: `${resolution}\n\n${audience}\n`,
  };
}

function escM(s) {
  return String(s).replace(/"/g, "'").replace(/\n/g, ' ');
}

function sanitizeId(s) {
  return String(s)
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 40);
}

function takeawayLang(analysis) {
  const sorted = [...analysis.per_lang].sort(
    (a, b) => b.share_pct - a.share_pct
  );
  const leader = sorted[0];
  const runner = sorted[1];
  if (!leader) return 'No language data available.';
  if (!runner) {
    return `${leader.lang} carries 100% of observed views in this window.`;
  }
  return `${leader.lang} leads with ${leader.share_pct}% of combined views vs ${runner.lang} (${runner.share_pct}%). Prioritize ${leader.lang} for localization depth; keep ${runner.lang} as secondary validation.`;
}

function takeawayMomentum(analysis) {
  const withGrowth = analysis.per_lang.filter((p) => p.growth_pct != null);
  if (!withGrowth.length)
    return 'Insufficient history for YoY-style momentum comparison.';
  const best = [...withGrowth].sort((a, b) => b.growth_pct - a.growth_pct)[0];
  const worst = [...withGrowth].sort((a, b) => a.growth_pct - b.growth_pct)[0];
  return `Strongest recent vs baseline momentum: ${best.lang} (${best.growth_pct > 0 ? '+' : ''}${best.growth_pct}%); weakest: ${worst.lang} (${worst.growth_pct > 0 ? '+' : ''}${worst.growth_pct}%). Treat spikes (${analysis.spikes.length} flagged) as event noise until validated.`;
}

function takeawayAction(analysis, resolveResult) {
  const top = analysis.per_lang[0];
  const missing = resolveResult.articles.filter((a) => !a.title);
  const parts = [];
  if (top) {
    parts.push(
      `Run a lightweight content/market test aimed at ${top.lang} readers around “${resolveResult.topic}”.`
    );
  }
  if (missing.length) {
    parts.push(
      `Manually resolve missing wiki pages for ${missing.map((m) => m.lang).join(', ')} before comparing those locales.`
    );
  }
  parts.push(
    'Cross-check with search trends or payment proxies before budget allocation.'
  );
  return parts.join(' ');
}
