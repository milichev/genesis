import {
  fetchPageviews,
  projectForLang,
  pickGranularity,
  defaultDateRange,
} from './lib/aqs.js';

/**
 * @param {{
 *   articles: Array<{ lang: string, title: string | null, status?: string }>,
 *   start?: string,
 *   end?: string,
 *   months?: number,
 *   granularity?: string,
 *   access?: string,
 *   agent?: string,
 *   useCache?: boolean,
 * }} opts
 */
export async function fetchArticles(opts) {
  const access = opts.access || 'all-access';
  const agent = opts.agent || 'user';
  const useCache = opts.useCache !== false;

  let start = opts.start;
  let end = opts.end;
  let granularity = opts.granularity;

  if (!start || !end) {
    const def = defaultDateRange(opts.months ?? 24);
    start = def.start;
    end = def.end;
    granularity = granularity || def.granularity;
  }

  granularity =
    granularity ||
    pickGranularity(start, end, false);

  const fetched = [];
  const errors = [];

  for (const art of opts.articles) {
    if (!art.title || art.status === 'missing_langlink') {
      fetched.push({
        lang: art.lang,
        title: null,
        project: projectForLang(art.lang),
        series: null,
        skipped: 'missing_langlink',
      });
      continue;
    }
    try {
      const pv = await fetchPageviews({
        project: projectForLang(art.lang),
        article: art.title,
        access,
        agent,
        granularity,
        start,
        end,
        useCache,
      });
      fetched.push({
        lang: art.lang,
        title: art.title,
        project: pv.project,
        series: pv.items,
        empty: pv.empty,
        granularity: pv.granularity,
        start: pv.start,
        end: pv.end,
      });
    } catch (err) {
      errors.push({
        lang: art.lang,
        title: art.title,
        error: String(err.message || err),
      });
    }
  }

  return {
    window: { start, end, granularity, access, agent },
    articles: fetched,
    errors,
  };
}
