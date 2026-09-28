export class WikiLangError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WikiLangError';
  }
}

/**
 * @param {string} lang
 * @param {string} [context]
 * @returns {string}
 */
export function assertWikiLang(lang, context = 'language code') {
  const raw = String(lang).trim();
  if (raw.includes(':')) {
    throw new WikiLangError(
      `Invalid ${context}: "${raw}" (language codes must not contain ':')`
    );
  }
  const s = raw.toLowerCase();
  if (s === 'ua') {
    throw new WikiLangError(
      'Invalid language "ua"; use "uk" for Ukrainian Wikipedia'
    );
  }
  if (!/^[a-z]{2,3}$/.test(s)) {
    throw new WikiLangError(`Invalid ${context}: "${raw}"`);
  }
  return s;
}

/**
 * @param {string} raw comma/space-separated list
 * @returns {string[]}
 */
export function parseWikiLangs(raw) {
  if (!raw) return ['en'];
  return [
    ...new Set(
      String(raw)
        .split(/[,;\s]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => assertWikiLang(part, '--langs'))
    ),
  ];
}

/**
 * @param {{ lang: string, title?: string | null, status: string, url?: string | null }} article
 */
export function serializeArticle(article) {
  if (article.status === 'missing_langlink') {
    return { lang: article.lang, status: article.status };
  }
  return {
    lang: article.lang,
    title: article.title,
    status: article.status,
    url: article.url ?? null,
  };
}
