import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {Array<{ lang: string, share_pct: number, views: number }>} perLang
 * @param {Array<{ lang: string, series: Array<{ timestamp: string, views: number }> | null }>} articles
 * @param {string} outDir
 */
export async function writeCharts(perLang, articles, window, outDir) {
  await fs.mkdir(outDir, { recursive: true });
  const sharePath = path.join(outDir, 'lang-share.svg');
  const trendPath = path.join(outDir, 'trend.svg');

  const shareSvg = renderShareBar(perLang);
  const trendSvg = renderTrend(articles, window.granularity);

  await fs.writeFile(sharePath, shareSvg, 'utf8');
  await fs.writeFile(trendPath, trendSvg, 'utf8');

  return {
    lang_share: sharePath,
    trend: trendPath,
  };
}

/**
 * @param {Array<{ lang: string, share_pct: number, views: number }>} perLang
 */
function renderShareBar(perLang) {
  const w = 520;
  const rowH = 28;
  const pad = { t: 24, r: 24, b: 24, l: 72 };
  const h = pad.t + pad.b + perLang.length * rowH;
  const maxBar = w - pad.l - pad.r;
  const maxShare = Math.max(...perLang.map((p) => p.share_pct), 1);

  let bars = '';
  perLang.forEach((p, i) => {
    const y = pad.t + i * rowH + 6;
    const bw = (p.share_pct / maxShare) * maxBar;
    bars += `<text x="${pad.l - 8}" y="${y + 14}" text-anchor="end" font-family="system-ui,sans-serif" font-size="12" fill="#333">${esc(p.lang)}</text>`;
    bars += `<rect x="${pad.l}" y="${y}" width="${bw.toFixed(1)}" height="18" fill="#3b82f6" rx="2"/>`;
    bars += `<text x="${pad.l + bw + 6}" y="${y + 14}" font-family="system-ui,sans-serif" font-size="11" fill="#555">${p.share_pct}% (${fmtNum(p.views)})</text>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <text x="${pad.l}" y="16" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111">Language demand share</text>
  ${bars}
</svg>`;
}

/**
 * @param {Array<{ lang: string, series: Array<{ timestamp: string, views: number }> | null }>} articles
 * @param {string} granularity
 */
function renderTrend(articles, granularity) {
  const active = articles.filter((a) => a.series?.length);
  const w = 640;
  const h = 320;
  const pad = { t: 32, r: 24, b: 48, l: 56 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  const allTs = new Set();
  for (const a of active) {
    for (const p of a.series) allTs.add(p.timestamp);
  }
  const timestamps = [...allTs].sort();
  if (timestamps.length === 0) {
    return emptySvg(w, h, 'No trend data');
  }

  const seriesByLang = active.map((a) => ({
    lang: a.lang,
    points: timestamps.map((ts) => {
      const hit = a.series.find((p) => p.timestamp === ts);
      return hit?.views ?? 0;
    }),
  }));

  if (granularity === 'daily' && timestamps.length > 14) {
    for (const s of seriesByLang) {
      s.points = rollingMean(s.points, 7);
    }
  }

  const maxY = Math.max(...seriesByLang.flatMap((s) => s.points), 1);
  const colors = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2'];

  const xStep = timestamps.length > 1 ? plotW / (timestamps.length - 1) : plotW;

  let paths = '';
  seriesByLang.forEach((s, idx) => {
    const color = colors[idx % colors.length];
    const coords = s.points.map((v, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + plotH - (v / maxY) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    paths += `<polyline fill="none" stroke="${color}" stroke-width="2" points="${coords.join(' ')}"/>`;
    paths += `<text x="${w - pad.r}" y="${pad.t + 14 + idx * 14}" font-family="system-ui,sans-serif" font-size="11" fill="${color}">${esc(s.lang)}</text>`;
  });

  const xLabels = pickXLabels(timestamps, 6);
  let xTicks = '';
  for (const { i, label } of xLabels) {
    const x = pad.l + i * xStep;
    xTicks += `<text x="${x}" y="${h - 8}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#666">${esc(label)}</text>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <text x="${pad.l}" y="20" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111">Views trend${granularity === 'daily' ? ' (7d rolling mean)' : ''}</text>
  <line x1="${pad.l}" y1="${pad.t + plotH}" x2="${pad.l + plotW}" y2="${pad.t + plotH}" stroke="#ccc"/>
  <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" stroke="#ccc"/>
  ${paths}
  ${xTicks}
</svg>`;
}

/** @param {number[]} arr @param {number} win */
function rollingMean(arr, win) {
  return arr.map((_, i) => {
    const start = Math.max(0, i - win + 1);
    const slice = arr.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/** @param {string[]} timestamps @param {number} maxLabels */
function pickXLabels(timestamps, maxLabels) {
  if (timestamps.length <= maxLabels) {
    return timestamps.map((ts, i) => ({ i, label: formatTsLabel(ts) }));
  }
  const step = Math.floor((timestamps.length - 1) / (maxLabels - 1));
  const out = [];
  for (let i = 0; i < timestamps.length; i += step) {
    out.push({ i, label: formatTsLabel(timestamps[i]) });
  }
  const last = timestamps.length - 1;
  if (out[out.length - 1]?.i !== last) {
    out.push({ i: last, label: formatTsLabel(timestamps[last]) });
  }
  return out;
}

function formatTsLabel(ts) {
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}`;
}

function fmtNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function emptySvg(w, h, msg) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><text x="20" y="40">${esc(msg)}</text></svg>`;
}
