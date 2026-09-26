const USER_AGENT =
  process.env.WIKI_STATS_UA ||
  'wiki-stats/0.1.0 (https://github.com/genesis/ai-school; contact@example.com)';

const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * @param {string} url
 * @param {RequestInit & { retries?: number }} [opts]
 */
export async function fetchJson(url, opts = {}) {
  const { retries = DEFAULT_RETRIES, ...init } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          ...(init.headers || {}),
        },
      });
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const delay = BASE_DELAY_MS * 2 ** attempt;
        await sleep(delay);
      }
    }
  }
  throw lastErr;
}

export { USER_AGENT };
