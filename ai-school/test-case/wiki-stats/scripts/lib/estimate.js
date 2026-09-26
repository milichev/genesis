import { PACE_MS } from './http.js';

export const RESOLVE_REQUESTS_FIXED = 3;
export const FETCH_PER_LANG = 1;
const ABSURD_LANG_COUNT = 50;

/**
 * @param {string[]} langs
 */
export function computeEstimate(langs) {
  const langCount = langs.length;
  const requests_est = RESOLVE_REQUESTS_FIXED + langCount * FETCH_PER_LANG;
  const estimation = Math.ceil((requests_est * PACE_MS) / 1000);

  /** @type {string | undefined} */
  let alert;
  if (langCount >= ABSURD_LANG_COUNT || requests_est >= ABSURD_LANG_COUNT) {
    alert = 'Infinite';
  } else if (estimation >= 300) {
    alert = 'Infinite';
  } else if (estimation >= 90) {
    alert = 'Extended';
  } else if (estimation >= 30) {
    alert = 'Moderate';
  } else if (estimation >= 10) {
    alert = 'Brief';
  }

  const out = {
    status: 'ok',
    estimation,
    requests_est,
    assumptions: {
      pace_ms: PACE_MS,
      resolve_requests: RESOLVE_REQUESTS_FIXED,
      fetch_per_lang: FETCH_PER_LANG,
    },
  };
  if (alert) out.alert = alert;
  return out;
}
