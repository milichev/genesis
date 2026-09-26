/**
 * @param {Array<{ lang: string, title: string | null, series: Array<{ timestamp: string, views: number }> | null }>} articles
 * @param {{ granularity: string }} window
 */
export function analyzePageviews(articles, window) {
  const active = articles.filter((a) => a.series && a.series.length > 0);
  const totalsByLang = active.map((a) => ({
    lang: a.lang,
    title: a.title,
    total: a.series.reduce((s, p) => s + (p.views || 0), 0),
  }));

  const combined = totalsByLang.reduce((s, x) => s + x.total, 0);
  const perLang = totalsByLang
    .map((x) => ({
      lang: x.lang,
      title: x.title,
      views: x.total,
      share_pct: combined > 0 ? round((100 * x.total) / combined, 1) : 0,
      ...growthForSeries(active.find((a) => a.lang === x.lang).series, window.granularity),
    }))
    .sort((a, b) => b.views - a.views);

  const spikes = detectSpikes(active, window.granularity);
  const caveats = buildCaveats(combined, perLang, articles, window);

  const top = perLang[0];
  const topGrowth = [...perLang].sort(
    (a, b) => (b.growth_pct ?? -999) - (a.growth_pct ?? -999),
  )[0];

  return {
    window,
    kpis: {
      combined_views: combined,
      top_lang: top?.lang ?? null,
      top_share_pct: top?.share_pct ?? 0,
      top_growth_lang: topGrowth?.lang ?? null,
      top_growth_pct: topGrowth?.growth_pct ?? null,
    },
    per_lang: perLang,
    spikes,
    caveats,
    series_meta: active.map((a) => ({
      lang: a.lang,
      points: a.series.length,
    })),
  };
}

/**
 * @param {Array<{ timestamp: string, views: number }>} series
 * @param {string} granularity
 */
function growthForSeries(series, granularity) {
  if (!series || series.length < 4) {
    return { growth_pct: null, growth_label: 'insufficient_data' };
  }
  const sorted = [...series].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const n = granularity === 'monthly' ? 3 : 30;
  const recent = sorted.slice(-n);
  const recentSum = sumViews(recent);

  let baseline = [];
  if (granularity === 'monthly') {
    const baselineTs = new Set(
      recent.map((p) => shiftTimestampMonths(p.timestamp, -12)),
    );
    baseline = sorted.filter((p) => baselineTs.has(p.timestamp));
  } else {
    baseline = sorted.slice(-n * 2, -n);
  }

  const baseSum = sumViews(baseline);
  if (baseSum < 1) {
    return { growth_pct: null, growth_label: 'no_baseline' };
  }
  const growth_pct = round(((recentSum - baseSum) / baseSum) * 100, 1);
  const label =
    granularity === 'monthly'
      ? `last_${n}_mo_vs_yoy`
      : `last_${n}d_vs_prior_${n}d`;
  return {
    growth_pct,
    growth_label: label,
    recent_views: recentSum,
    baseline_views: baseSum,
  };
}

/** @param {string} ts YYYYMMDDHH (AQS) */
function shiftTimestampMonths(ts, delta) {
  const y = parseInt(ts.slice(0, 4), 10);
  const m = parseInt(ts.slice(4, 6), 10);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const suffix = ts.length > 6 ? ts.slice(6) : '0100';
  return `${yy}${mm}${suffix}`;
}

/**
 * @param {Array<{ lang: string, series: Array<{ timestamp: string, views: number }> }>} active
 * @param {string} granularity
 */
function detectSpikes(active, granularity) {
  /** @type {Array<{ lang: string, timestamp: string, views: number, z: number }>} */
  const spikes = [];
  for (const a of active) {
    const vals = a.series.map((p) => p.views);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const variance =
      vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(vals.length, 1);
    const std = Math.sqrt(variance) || 1;
    for (const p of a.series) {
      const z = (p.views - mean) / std;
      if (z >= 2.5 && p.views > mean * 1.5) {
        spikes.push({
          lang: a.lang,
          timestamp: p.timestamp,
          views: p.views,
          z: round(z, 2),
          granularity,
        });
      }
    }
  }
  return spikes.slice(0, 8);
}

function buildCaveats(combined, perLang, articles, window) {
  const caveats = [
    'Wikipedia pageviews measure readership interest, not willingness to pay or course enrollment.',
  ];
  const missing = articles.filter((a) => a.status === 'missing_langlink' || !a.title);
  if (missing.length) {
    caveats.push(
      `Missing langlinks for: ${missing.map((m) => m.lang).join(', ')} — no pageview series fetched.`,
    );
  }
  if (combined < 5000) {
    caveats.push(
      'Low combined volume in window; percentage shares and growth slopes may be noisy.',
    );
  }
  const tiny = perLang.filter((p) => p.views < 500);
  if (tiny.length) {
    caveats.push(
      `Very low views for ${tiny.map((t) => t.lang).join(', ')}; treat rankings cautiously.`,
    );
  }
  if (window.granularity === 'monthly') {
    caveats.push(
      'Monthly series smooths short spikes; check spike flags and event-driven outliers.',
    );
  }
  return caveats;
}

function sumViews(points) {
  return points.reduce((s, p) => s + (p.views || 0), 0);
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/**
 * Compact summary for stdout (no raw series)
 * @param {object} resolveResult
 * @param {object} analysis
 * @param {object} paths
 */
export function buildSummary(resolveResult, fetchBundle, analysis, paths) {
  return {
    status: 'ok',
    topic: resolveResult.topic,
    articles: resolveResult.articles.map((a) => ({
      lang: a.lang,
      title: a.title,
      status: a.status,
    })),
    window: fetchBundle.window,
    kpis: analysis.kpis,
    per_lang: analysis.per_lang.map((p) => ({
      lang: p.lang,
      share_pct: p.share_pct,
      views: p.views,
      growth_pct: p.growth_pct,
      growth_label: p.growth_label,
    })),
    spikes: analysis.spikes,
    caveats: analysis.caveats,
    paths,
  };
}
