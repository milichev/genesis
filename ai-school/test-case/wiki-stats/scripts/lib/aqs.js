import { fetchJson, logHttpLine } from './http.js';
import {
  cacheKey,
  cachePath,
  readCache,
  writeCache,
  ensureCacheDir,
} from './cache.js';
import { encodeArticleTitle, normalizeTitle } from './mediawiki.js';

const AQS_BASE =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article';

/**
 * @param {Date} d
 */
export function formatAqsDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Default window: last N months ending at previous complete month
 * @param {number} months
 */
export function defaultDateRange(months = 24) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  end.setUTCMonth(end.getUTCMonth() - 1);
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));
  return {
    start: formatAqsDate(start),
    end: formatAqsDate(end),
    granularity: 'monthly',
  };
}

/**
 * @param {string} start YYYYMMDD
 * @param {string} end YYYYMMDD
 */
export function pickGranularity(start, end, preferDaily = false) {
  const sy = parseInt(start.slice(0, 4), 10);
  const sm = parseInt(start.slice(4, 6), 10);
  const sd = parseInt(start.slice(6, 8), 10);
  const ey = parseInt(end.slice(0, 4), 10);
  const em = parseInt(end.slice(4, 6), 10);
  const ed = parseInt(end.slice(6, 8), 10);
  const startD = Date.UTC(sy, sm - 1, sd);
  const endD = Date.UTC(ey, em - 1, ed);
  const days = (endD - startD) / (86400 * 1000);
  if (preferDaily && days <= 90) return 'daily';
  return days <= 90 ? 'daily' : 'monthly';
}

/**
 * @param {{
 *   project: string,
 *   article: string,
 *   access?: string,
 *   agent?: string,
 *   granularity: string,
 *   start: string,
 *   end: string,
 *   useCache?: boolean,
 * }} opts
 */
export async function fetchPageviews(opts) {
  const {
    project,
    article,
    access = 'all-access',
    agent = 'user',
    granularity,
    start,
    end,
    useCache = true,
  } = opts;
  const title = normalizeTitle(article);
  const encoded = encodeArticleTitle(title);
  const key = cacheKey([
    'aqs',
    project,
    access,
    agent,
    encoded,
    granularity,
    start,
    end,
  ]);
  const cp = cachePath('aqs', key);
  const url = `${AQS_BASE}/${project}/${access}/${agent}/${encoded}/${granularity}/${start}/${end}`;
  if (useCache) {
    await ensureCacheDir();
    const cached = await readCache(cp);
    if (cached) {
      await logHttpLine({
        method: 'GET',
        url,
        status: 200,
        durationMs: 0,
        waitMs: 0,
        cache: 'hit',
      });
      return cached;
    }
  }

  let data;
  try {
    data = await fetchJson(url);
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes('404') || msg.includes('Not Found')) {
      return { items: [], project, article: title, empty: true };
    }
    throw err;
  }

  const items = (data.items || []).map((it) => ({
    timestamp: it.timestamp,
    views: it.views ?? 0,
  }));

  const result = { items, project, article: title, granularity, start, end };
  if (useCache) {
    await writeCache(cp, result);
  }
  return result;
}

/** @param {string} lang */
export function projectForLang(lang) {
  return `${lang}.wikipedia`;
}
