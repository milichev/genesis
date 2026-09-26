import {
  opensearch,
  getLanglinks,
  parseExplicitTitle,
  normalizeTitle,
  resolveTitleOnWiki,
} from './lib/mediawiki.js';

/** @param {string} query @param {string} title */
function tokenScore(query, title) {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 0;
  const t = title.toLowerCase().replace(/_/g, ' ');
  let hits = 0;
  for (const w of words) {
    if (t.includes(w)) hits++;
  }
  return hits / words.length;
}

/**
 * @param {import('./lib/mediawiki.js').opensearch extends Function ? Awaited<ReturnType<typeof opensearch>> : never} candidates
 * @param {string} query
 */
function pickSearchResult(candidates, query) {
  if (candidates.length === 0) {
    return { status: 'not_found', candidates: [] };
  }
  if (candidates.length === 1) {
    return { status: 'ok', chosen: candidates[0] };
  }
  const s0 = tokenScore(query, candidates[0].title);
  const s1 = tokenScore(query, candidates[1].title);
  const gap = s0 - s1;
  if (s0 >= 0.99 || (s0 >= 0.66 && gap >= 0.34)) {
    return { status: 'ok', chosen: candidates[0] };
  }
  if (s0 < 0.4) {
    return {
      status: 'needs_confirmation',
      candidates: candidates.slice(0, 3),
      reason: 'weak_match',
    };
  }
  if (gap < 0.25) {
    return {
      status: 'needs_confirmation',
      candidates: candidates.slice(0, 3),
      reason: 'ambiguous',
    };
  }
  return { status: 'ok', chosen: candidates[0] };
}

/**
 * @param {{
 *   topic: string,
 *   langs: string[],
 *   pivotLang?: string,
 *   title?: string,
 * }} input
 */
export async function resolveTopic(input) {
  const langs = [...new Set(input.langs.map((l) => l.toLowerCase()))];
  let pivotLang = (input.pivotLang || 'en').toLowerCase();

  let pivotArticle;
  let topicLabel = input.topic;

  if (input.title) {
    const explicit = parseExplicitTitle(input.title);
    if (explicit) {
      const resolved = await resolveTitleOnWiki(explicit.lang, explicit.title);
      if (!resolved) {
        return {
          status: 'error',
          error: `Title not found: ${input.title}`,
        };
      }
      pivotLang = explicit.lang;
      pivotArticle = { lang: explicit.lang, title: resolved };
      topicLabel = input.topic || explicit.title.replace(/_/g, ' ');
    } else {
      const resolved = await resolveTitleOnWiki(pivotLang, input.title);
      if (!resolved) {
        return {
          status: 'error',
          error: `Title not found on ${pivotLang}: ${input.title}`,
        };
      }
      pivotArticle = { lang: pivotLang, title: resolved };
    }
  } else {
    const explicit = parseExplicitTitle(input.topic);
    if (explicit) {
      const resolved = await resolveTitleOnWiki(explicit.lang, explicit.title);
      if (!resolved) {
        return { status: 'error', error: `Title not found: ${input.topic}` };
      }
      pivotArticle = { lang: explicit.lang, title: resolved };
      topicLabel = explicit.title.replace(/_/g, ' ');
    } else {
      let searchLang = pivotLang;
      let candidates = await opensearch(searchLang, input.topic, 5);
      if (candidates.length === 0 && searchLang !== 'en') {
        searchLang = 'en';
        candidates = await opensearch(searchLang, input.topic, 5);
      }
      const pick = pickSearchResult(candidates, input.topic);
      if (pick.status === 'needs_confirmation') {
        return {
          status: 'needs_confirmation',
          pivot_lang: searchLang,
          query: input.topic,
          candidates: pick.candidates,
          reason: pick.reason,
        };
      }
      if (pick.status === 'not_found') {
        return { status: 'error', error: `No articles for: ${input.topic}` };
      }
      pivotLang = searchLang;
      const resolved = await resolveTitleOnWiki(
        searchLang,
        pick.chosen.title,
      );
      pivotArticle = {
        lang: searchLang,
        title: resolved || normalizeTitle(pick.chosen.title),
      };
    }
  }

  const llData = await getLanglinks(pivotArticle.lang, pivotArticle.title);
  const linkMap = new Map(
    llData.langlinks.map((ll) => [ll.lang, normalizeTitle(ll.title)]),
  );

  /** @type {Array<{ lang: string, title: string, status: string }>} */
  const articles = [];
  const targetLangs = new Set(langs);

  for (const lang of targetLangs) {
    if (lang === pivotArticle.lang) {
      articles.push({
        lang,
        title: pivotArticle.title,
        status: 'pivot',
      });
      continue;
    }
    const linked = linkMap.get(lang);
    if (linked) {
      articles.push({ lang, title: linked, status: 'linked' });
    } else {
      articles.push({ lang, title: null, status: 'missing_langlink' });
    }
  }

  return {
    status: 'ok',
    topic: topicLabel,
    pivot: pivotArticle,
    articles,
    langlink_source: llData.title,
  };
}
