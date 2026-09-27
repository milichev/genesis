import { PACE_MS } from './http.js';

export const RESOLVE_REQUESTS_FIXED = 3;
export const FETCH_PER_LANG = 1;

/** @param {number} langCount */
function alertForLangCount(langCount) {
  if (langCount < 5) return undefined;
  if (langCount < 10) return 'Brief';
  if (langCount < 20) return 'Moderate';
  if (langCount < 50) return 'Extended';
  return 'Infinite';
}

/**
 * @param {string[]} langs
 */
export function computeEstimate(langs) {
  const langCount = langs.length;
  const requests_est = RESOLVE_REQUESTS_FIXED + langCount * FETCH_PER_LANG;
  const estimation = Math.ceil((requests_est * PACE_MS) / 1000);

  const alert = alertForLangCount(langCount);

  const out = {
    status: 'ok',
    estimation,
    requests_est,
    assumptions: {
      pace_ms: PACE_MS,
      resolve_requests: RESOLVE_REQUESTS_FIXED,
      fetch_per_lang: FETCH_PER_LANG,
      months_affect_requests: false,
    },
  };
  if (alert) out.alert = alert;
  return out;
}
