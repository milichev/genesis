import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = path.resolve(__dirname, '../..');

/** Writable cache — never under ~/.agents/skills (often EPERM). */
export function resolveCacheDir() {
  if (process.env.WIKI_STATS_CACHE) {
    return path.resolve(process.env.WIKI_STATS_CACHE);
  }
  if (process.env.XDG_CACHE_HOME) {
    return path.join(process.env.XDG_CACHE_HOME, 'wiki-stats');
  }
  return path.join(os.homedir(), '.cache', 'wiki-stats');
}

export const CACHE_DIR = resolveCacheDir();

export function cacheKey(parts) {
  const raw = parts.join('|');
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} namespace e.g. 'aqs', 'mw'
 * @param {string} key
 */
export function cachePath(namespace, key) {
  return path.join(CACHE_DIR, namespace, `${key}.json`);
}

/**
 * @param {string} filePath
 */
export async function readCache(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} filePath
 * @param {unknown} data
 */
export async function writeCache(filePath, data) {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 0), 'utf8');
  } catch {
    // Cache is best-effort; skill install dirs / sandboxes may deny writes.
  }
}
