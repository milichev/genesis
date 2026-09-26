import fs from 'node:fs/promises';
import path from 'node:path';

/** @see references/aqs.md — set WIKI_STATS_UA to wiki-stats/0.1 (https://…; email@…) */
export const USER_AGENT =
  process.env.WIKI_STATS_UA ||
  'wiki-stats/0.1.0 (https://github.com/genesis/ai-school; contact@example.com)';

export const PACE_MS = 350;
const MAX_IN_FLIGHT = 1;
const DEFAULT_ATTEMPTS = 5;
const MIN_BACKOFF_MS = 5000;
const BASE_BACKOFF_MS = 500;

/** @type {string | null} */
let logSinkPath = null;

/**
 * @param {string | null | undefined} filePath
 */
export function setLogSink(filePath) {
  logSinkPath = filePath ? path.resolve(filePath) : null;
}

/**
 * @param {{
 *   method?: string,
 *   url: string,
 *   status?: number | string,
 *   error?: string,
 *   durationMs?: number,
 *   waitMs?: number,
 *   cache?: 'hit' | 'miss',
 * }} entry
 */
export async function logHttpLine(entry) {
  if (!logSinkPath) return;
  const ts = new Date().toISOString();
  const method = entry.method || 'GET';
  const statusPart =
    entry.error != null
      ? `error=${entry.error}`
      : `status=${entry.status ?? '?'}`;
  const ms = entry.durationMs ?? 0;
  const wait = entry.waitMs ?? 0;
  const cache = entry.cache ?? 'miss';
  const line = `${ts} ${method} ${entry.url} ${statusPart} ms=${ms} wait_ms=${wait} cache=${cache}\n`;
  await fs.mkdir(path.dirname(logSinkPath), { recursive: true });
  await fs.appendFile(logSinkPath, line, 'utf8');
}

export class HttpError extends Error {
  /**
   * @param {string} message
   * @param {{ status: number, retryable: boolean, url: string }} meta
   */
  constructor(message, meta) {
    super(message);
    this.name = 'HttpError';
    this.status = meta.status;
    this.retryable = meta.retryable;
    this.url = meta.url;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** @type {Promise<void>} */
let pacerTail = Promise.resolve();
/** @type {number} */
let lastRequestStart = 0;
/** @type {number} */
let inFlight = 0;

/**
 * @param {() => Promise<T>} fn
 * @returns {Promise<{ result: T, waitMs: number }>}
 * @template T
 */
function runPaced(fn) {
  const job = pacerTail.then(async () => {
    while (inFlight >= MAX_IN_FLIGHT) {
      await sleep(10);
    }
    const now = Date.now();
    const waitMs = Math.max(0, PACE_MS - (now - lastRequestStart));
    if (waitMs > 0) await sleep(waitMs);
    lastRequestStart = Date.now();
    inFlight++;
    try {
      const result = await fn();
      return { result, waitMs };
    } finally {
      inFlight--;
    }
  });
  pacerTail = job.then(
    () => {},
    () => {}
  );
  return job;
}

/**
 * @param {string | null} header
 * @returns {number | null} ms to wait
 */
function parseRetryAfterMs(header) {
  if (!header) return null;
  const trimmed = header.trim();
  const asSec = parseInt(trimmed, 10);
  if (!Number.isNaN(asSec)) return asSec * 1000;
  const asDate = Date.parse(trimmed);
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

/**
 * @param {string} url
 * @param {RequestInit & { attempts?: number, method?: string }} [opts]
 */
export async function fetchJson(url, opts = {}) {
  const { attempts = DEFAULT_ATTEMPTS, method = 'GET', ...init } = opts;
  let lastErr;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const t0 = Date.now();
    let waitMs = 0;
    try {
      const { result: res, waitMs: pacedWait } = await runPaced(async () =>
        fetch(url, {
          ...init,
          method,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'application/json',
            ...(init.headers || {}),
          },
        })
      );
      waitMs = pacedWait;

      if (res.status === 429 || res.status === 503 || res.status >= 500) {
        const body = await res.text().catch(() => '');
        const retryable =
          res.status === 429 || res.status === 503 || res.status >= 500;
        const err = new HttpError(`HTTP ${res.status}: ${body.slice(0, 200)}`, {
          status: res.status,
          retryable,
          url,
        });
        const durationMs = Date.now() - t0;
        if (retryable && attempt < attempts - 1) {
          await logHttpLine({
            method,
            url,
            status: res.status,
            error: `retry_${attempt + 1}`,
            durationMs,
            waitMs,
            cache: 'miss',
          });
          const retryAfter = parseRetryAfterMs(res.headers.get('Retry-After'));
          const delay =
            retryAfter ??
            Math.max(MIN_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
          await sleep(delay);
          lastErr = err;
          continue;
        }
        await logHttpLine({
          method,
          url,
          status: res.status,
          error: err.message.slice(0, 120),
          durationMs,
          waitMs,
          cache: 'miss',
        });
        throw err;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new HttpError(`HTTP ${res.status}: ${body.slice(0, 300)}`, {
          status: res.status,
          retryable: false,
          url,
        });
        await logHttpLine({
          method,
          url,
          status: res.status,
          error: err.message.slice(0, 120),
          durationMs: Date.now() - t0,
          waitMs,
          cache: 'miss',
        });
        throw err;
      }

      const json = await res.json();
      await logHttpLine({
        method,
        url,
        status: res.status,
        durationMs: Date.now() - t0,
        waitMs,
        cache: 'miss',
      });
      return json;
    } catch (err) {
      lastErr = err;
      if (err instanceof HttpError) {
        if (err.retryable && attempt < attempts - 1) continue;
        throw err;
      }
      const durationMs = Date.now() - t0;
      await logHttpLine({
        method,
        url,
        status: 'fail',
        error: String(err.message || err).slice(0, 120),
        durationMs,
        waitMs,
        cache: 'miss',
      });
      if (attempt < attempts - 1) {
        await sleep(BASE_BACKOFF_MS * 2 ** attempt);
        continue;
      }
      throw new HttpError(String(err.message || err), {
        status: 0,
        retryable: false,
        url,
      });
    }
  }

  throw (
    lastErr ||
    new HttpError('Request failed after retries', {
      status: 0,
      retryable: false,
      url,
    })
  );
}
