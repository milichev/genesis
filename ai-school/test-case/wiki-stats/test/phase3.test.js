import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { computeEstimate } from '../scripts/lib/estimate.js';
import { buildSummary } from '../scripts/analyze.js';
import { buildMermaid } from '../scripts/brief.js';

const CLI = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../scripts/cli.js'
);

function runCli(args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
  });
}

test('estimate: 2 langs → no alert key', () => {
  const out = computeEstimate(['pl', 'cs']);
  assert.equal(out.status, 'ok');
  assert.equal(out.estimation, 2);
  assert.equal(out.requests_est, 5);
  assert.equal(out.assumptions.months_affect_requests, false);
  assert.equal('alert' in out, false);
});

test('estimate: 5 langs → Brief alert', () => {
  const out = computeEstimate(['pl', 'cs', 'uk', 'de', 'fr']);
  assert.equal(out.alert, 'Brief');
  assert.equal(out.requests_est, 8);
});

test('resolve: bad --pivot en:Nirvana → JSON error exit 2', () => {
  const r = runCli([
    'resolve',
    '--topic',
    'Nirvana',
    '--pivot',
    'en:Nirvana',
    '--langs',
    'en',
  ]);
  assert.equal(r.status, 2);
  const payload = JSON.parse(r.stdout.trim());
  assert.equal(payload.status, 'error');
  assert.match(payload.error, /:/);
});

test('buildSummary: missing_langlink article is {lang, status} only', () => {
  const summary = buildSummary(
    {
      topic: 'Nirvana',
      articles: [
        {
          lang: 'pl',
          title: null,
          status: 'missing_langlink',
          url: null,
        },
      ],
    },
    { articles: [], window: { start: '20240101', end: '20241231', granularity: 'monthly' } },
    {
      kpis: { combined_views: 0 },
      per_lang: [],
      spikes: [],
      caveats: [],
    },
    {}
  );
  assert.deepEqual(summary.articles[0], {
    lang: 'pl',
    status: 'missing_langlink',
  });
});

test('buildMermaid: pivot and linked nodes contain href', () => {
  const resolveResult = {
    topic: 'Nirvana',
    pivot: { lang: 'en', title: 'Nirvana_(band)' },
    articles: [
      {
        lang: 'en',
        title: 'Nirvana_(band)',
        status: 'pivot',
        url: 'https://en.wikipedia.org/wiki/Nirvana_(band)',
      },
      {
        lang: 'de',
        title: 'Nirvana_(Band)',
        status: 'linked',
        url: 'https://de.wikipedia.org/wiki/Nirvana_(Band)',
      },
      {
        lang: 'pl',
        title: null,
        status: 'missing_langlink',
        url: null,
      },
    ],
  };
  const analysis = {
    per_lang: [
      { lang: 'en', share_pct: 60, growth_pct: 1 },
      { lang: 'de', share_pct: 40, growth_pct: -1 },
    ],
  };
  const { resolution } = buildMermaid(resolveResult, analysis);
  assert.match(resolution, /href='https:\/\/en\.wikipedia\.org\/wiki\/Nirvana_\(band\)'/);
  assert.match(resolution, /href='https:\/\/de\.wikipedia\.org\/wiki\/Nirvana_\(Band\)'/);
  assert.match(resolution, /pl: missing langlink/);
  assert.doesNotMatch(resolution, /plMissing.*href=/);
});
