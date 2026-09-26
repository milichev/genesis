import { fetchJson } from './http.js';

/** @param {string} title */
export function normalizeTitle(title) {
  return title.trim().replace(/ /g, '_');
}

/** @param {string} title for URL path segment */
export function encodeArticleTitle(title) {
  return encodeURIComponent(normalizeTitle(title));
}

/** @param {string} lang */
export function wikiApiBase(lang) {
  return `https://${lang}.wikipedia.org/w/api.php`;
}

/**
 * @param {string} lang
 * @param {string} query
 * @param {number} limit
 */
export async function opensearch(lang, query, limit = 5) {
  const params = new URLSearchParams({
    action: 'opensearch',
    search: query,
    limit: String(limit),
    namespace: '0',
    format: 'json',
    origin: '*',
  });
  const url = `${wikiApiBase(lang)}?${params}`;
  const data = await fetchJson(url);
  // [searchTerm, titles[], descriptions[], urls[]]
  const [, titles, descriptions, urls] = data;
  return titles.map((t, i) => ({
    title: t,
    description: descriptions[i] || '',
    url: urls[i] || '',
  }));
}

/**
 * @param {string} lang
 * @param {string} title
 */
export async function getLanglinks(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'langlinks',
    titles: normalizeTitle(title),
    lllimit: '500',
    format: 'json',
    origin: '*',
  });
  const url = `${wikiApiBase(lang)}?${params}`;
  const data = await fetchJson(url);
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    return { title: normalizeTitle(title), langlinks: [], missing: true };
  }
  const links = (page.langlinks || []).map((ll) => ({
    lang: ll.lang,
    title: ll['*'],
  }));
  return { title: page.title.replace(/ /g, '_'), langlinks: links, missing: false };
}

/**
 * Parse "pl:Some_Title" or plain topic
 * @param {string} input
 */
export function parseExplicitTitle(input) {
  const m = /^([a-z]{2,3}):(.+)$/i.exec(input.trim());
  if (m) {
    return { lang: m[1].toLowerCase(), title: normalizeTitle(m[2]) };
  }
  return null;
}

/**
 * @param {string} lang
 * @param {string} title
 */
export async function resolveTitleOnWiki(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    titles: normalizeTitle(title),
    redirects: '1',
    format: 'json',
    origin: '*',
  });
  const url = `${wikiApiBase(lang)}?${params}`;
  const data = await fetchJson(url);
  const pages = data.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) {
    return null;
  }
  return normalizeTitle(page.title);
}
