import { Bench } from 'tinybench';
import { z } from 'zod';
import { taggedEnum } from './tagged-types';

// =============================================================================
// Console Colors & Formatting
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function progressBar(current: number, total: number, width = 30): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
  return `[${bar}] ${current}/${total}`;
}

// =============================================================================
// Tagged Enum Definition
// =============================================================================

const RemoteData = taggedEnum({
  Idle: {},
  Loading: {},
  Success: { data: z.number(), message: z.string() },
  Failure: { code: z.number(), reason: z.string() },
});


// =============================================================================
// Manual Implementation (Baseline)
// =============================================================================

type ManualRemoteData =
  | { _tag: 'Idle' }
  | { _tag: 'Loading' }
  | { _tag: 'Success'; data: number; message: string }
  | { _tag: 'Failure'; code: number; reason: string };

const ManualRemoteData = {
  Idle: (): ManualRemoteData => ({ _tag: 'Idle' }),
  Loading: (): ManualRemoteData => ({ _tag: 'Loading' }),
  Success: (payload: { data: number; message: string }): ManualRemoteData => ({
    _tag: 'Success',
    ...payload,
  }),
  Failure: (payload: { code: number; reason: string }): ManualRemoteData => ({
    _tag: 'Failure',
    ...payload,
  }),
};

function manualMatchAll<T>(
  value: ManualRemoteData,
  cases: {
    Idle: () => T;
    Loading: () => T;
    Success: (payload: { data: number; message: string }) => T;
    Failure: (payload: { code: number; reason: string }) => T;
  }
): T {
  switch (value._tag) {
    case 'Idle':
      return cases.Idle();
    case 'Loading':
      return cases.Loading();
    case 'Success':
      return cases.Success({ data: value.data, message: value.message });
    case 'Failure':
      return cases.Failure({ code: value.code, reason: value.reason });
  }
}

function manualMatchSome<T>(
  value: ManualRemoteData,
  cases: Partial<{
    Idle: () => T;
    Loading: () => T;
    Success: (payload: { data: number; message: string }) => T;
    Failure: (payload: { code: number; reason: string }) => T;
    _default: () => T;
  }>
): T | undefined {
  switch (value._tag) {
    case 'Idle':
      return cases.Idle?.() ?? cases._default?.();
    case 'Loading':
      return cases.Loading?.() ?? cases._default?.();
    case 'Success':
      return cases.Success?.({ data: value.data, message: value.message }) ?? cases._default?.();
    case 'Failure':
      return cases.Failure?.({ code: value.code, reason: value.reason }) ?? cases._default?.();
  }
}

function manualIs<Tag extends ManualRemoteData['_tag']>(
  tag: Tag
): (value: ManualRemoteData) => value is Extract<ManualRemoteData, { _tag: Tag }> {
  return (value): value is Extract<ManualRemoteData, { _tag: Tag }> => value._tag === tag;
}

const manualSchema = z.discriminatedUnion('_tag', [
  z.object({ _tag: z.literal('Idle') }),
  z.object({ _tag: z.literal('Loading') }),
  z.object({ _tag: z.literal('Success'), data: z.number(), message: z.string() }),
  z.object({ _tag: z.literal('Failure'), code: z.number(), reason: z.string() }),
]);

// =============================================================================
// Benchmark Runner
// =============================================================================

type BenchmarkResult = {
  name: string;
  taggedOps: number;
  manualOps: number;
};

function formatOps(ops: number): string {
  return `${(ops / 1000000).toFixed(1)}M ops/s`;
}

function compareResults(results: BenchmarkResult[]): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.bold}${colors.magenta}📊 RÉSULTATS COMPARATIFS${colors.reset}`);
  console.log(`${'='.repeat(70)}\n`);

  let taggedWins = 0;
  let manualWins = 0;

  for (const result of results) {
    const diff = ((result.manualOps - result.taggedOps) / result.manualOps) * 100;
    const taggedFaster = result.taggedOps > result.manualOps;

    if (taggedFaster) taggedWins++;
    else manualWins++;

    const emoji = taggedFaster ? '🏆' : '🐢';
    const winner = taggedFaster ? 'taggedEnum' : 'manual';
    const winnerColor = taggedFaster ? colors.green : colors.yellow;
    const slowdownPercent = Math.abs(diff).toFixed(1);

    console.log(`${colors.bold}${result.name}${colors.reset}`);
    console.log(`   ${emoji} Gagnant: ${winnerColor}${winner}${colors.reset}`);
    console.log(
      `   📈 taggedEnum: ${colors.cyan}${(result.taggedOps / 1000000).toFixed(2)}M${colors.reset} ops/sec`
    );
    console.log(`   📈 manual:     ${colors.cyan}${(result.manualOps / 1000000).toFixed(2)}M${colors.reset} ops/sec`);

    if (taggedFaster) {
      console.log(`   ${colors.red}⚠️  manual est ${slowdownPercent}% plus lent${colors.reset}\n`);
    } else {
      console.log(`   ${colors.red}⚠️  taggedEnum est ${slowdownPercent}% plus lent${colors.reset}\n`);
    }
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`${colors.bold}🎯 SCORE FINAL${colors.reset}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   ${colors.green}🏆 taggedEnum gagne: ${taggedWins}${colors.reset} benchmarks`);
  console.log(`   ${colors.yellow}📝 manual gagne:     ${manualWins}${colors.reset} benchmarks`);

  if (taggedWins > manualWins) {
    console.log(`\n   ${colors.bgGreen}${colors.bold} ✅ taggedEnum est globalement PLUS RAPIDE! ${colors.reset}\n`);
  } else if (manualWins > taggedWins) {
    console.log(`\n   ${colors.bgRed}${colors.bold} ⚠️  manual est globalement plus rapide ${colors.reset}\n`);
  } else {
    console.log(`\n   ${colors.yellow}${colors.bold}🤝 Égalité!${colors.reset}\n`);
  }

  // ---------------------------------------------------------------------------
  // Markdown Table for README
  // ---------------------------------------------------------------------------
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.bold}${colors.cyan}📋 TABLEAU MARKDOWN (pour README.md)${colors.reset}`);
  console.log(`${'='.repeat(70)}\n`);

  console.log('| Operation | taggedEnum | manual | 🏆 Winner | Slower by |');
  console.log('|-----------|------------|--------|-----------|-----------|');

  for (const result of results) {
    const taggedFaster = result.taggedOps > result.manualOps;
    const diff = Math.abs(((result.manualOps - result.taggedOps) / Math.max(result.manualOps, result.taggedOps)) * 100);
    const winner = taggedFaster ? 'taggedEnum' : 'manual';
    const slower = taggedFaster ? `manual +${diff.toFixed(1)}%` : `taggedEnum +${diff.toFixed(1)}%`;
    const name = result.name.replace(/^[^\s]+\s/, ''); // Remove emoji prefix

    console.log(`| ${name} | ${formatOps(result.taggedOps)} | ${formatOps(result.manualOps)} | ${winner} | ${slower} |`);
  }

  console.log(`\n**Score final: ${taggedWins > manualWins ? '🏆 taggedEnum' : manualWins > taggedWins ? '🏆 manual' : '🤝 Égalité'} (${taggedWins}-${manualWins})**`);

  // ---------------------------------------------------------------------------
  // Environment Info
  // ---------------------------------------------------------------------------
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${colors.bold}${colors.dim}🖥️  ENVIRONNEMENT${colors.reset}`);
  console.log(`${'='.repeat(70)}`);
  console.log(`   📅 Date: ${new Date().toISOString().split('T')[0]}`);
  console.log(`   🥟 Bun: ${Bun.version}`);
  console.log(`   💻 Platform: ${process.platform} ${process.arch}`);
  console.log(`   🔧 OS: ${Bun.env.TERM_PROGRAM ?? 'unknown'}\n`);
}

async function run_benchmarks() {
  console.log(`\n${colors.bold}${colors.cyan}🚀 Starting taggedEnum Performance Benchmarks${colors.reset}\n`);
  console.log('='.repeat(70));

  const results: BenchmarkResult[] = [];
  const BENCH_TIME = 200; // Réduit de 1000ms à 200ms pour plus de rapidité

  // ---------------------------------------------------------------------------
  // Benchmark 1: Object Creation
  // ---------------------------------------------------------------------------
  const creation_bench = new Bench({ name: 'Object Creation', time: BENCH_TIME });

  creation_bench
    .add('taggedEnum - create empty payload', () => {
      RemoteData.Idle();
      RemoteData.Loading();
    })
    .add('manual - create empty payload', () => {
      ManualRemoteData.Idle();
      ManualRemoteData.Loading();
    })
    .add('taggedEnum - create with payload', () => {
      RemoteData.Success({ data: 42, message: 'ok' });
      RemoteData.Failure({ code: 404, reason: 'not found' });
    })
    .add('manual - create with payload', () => {
      ManualRemoteData.Success({ data: 42, message: 'ok' });
      ManualRemoteData.Failure({ code: 404, reason: 'not found' });
    });

  console.log(`\n${colors.cyan}⏳ Object Creation${colors.reset} ${progressBar(1, 5)}`);
  await creation_bench.run();
  console.log(`${colors.green}✓${colors.reset} Terminé!`);

  results.push({
    name: '📦 Object Creation (empty)',
    taggedOps: creation_bench.tasks[0]?.result?.hz ?? 0,
    manualOps: creation_bench.tasks[1]?.result?.hz ?? 0,
  });
  results.push({
    name: '📦 Object Creation (payload)',
    taggedOps: creation_bench.tasks[2]?.result?.hz ?? 0,
    manualOps: creation_bench.tasks[3]?.result?.hz ?? 0,
  });

  // ---------------------------------------------------------------------------
  // Benchmark 2: matchAll
  // ---------------------------------------------------------------------------
  const match_all_bench = new Bench({ name: 'matchAll', time: BENCH_TIME });

  const tagged_idle = RemoteData.Idle();
  const tagged_success = RemoteData.Success({ data: 42, message: 'ok' });
  const manual_idle = ManualRemoteData.Idle();
  const manual_success = ManualRemoteData.Success({ data: 42, message: 'ok' });

  const tagged_cases = {
    Idle: () => 'idle',
    Loading: () => 'loading',
    Success: ({ data }: { data: number }) => `success: ${data}`,
    Failure: ({ reason }: { reason: string }) => `failure: ${reason}`,
  };

  const manual_cases = {
    Idle: () => 'idle',
    Loading: () => 'loading',
    Success: ({ data }: { data: number; message: string }) => `success: ${data}`,
    Failure: ({ reason }: { code: number; reason: string }) => `failure: ${reason}`,
  };

  match_all_bench
    .add('taggedEnum - matchAll (empty payload)', () => {
      RemoteData.matchAll(tagged_idle, tagged_cases);
    })
    .add('manual - matchAll (empty payload)', () => {
      manualMatchAll(manual_idle, manual_cases);
    })
    .add('taggedEnum - matchAll (with payload)', () => {
      RemoteData.matchAll(tagged_success, tagged_cases);
    })
    .add('manual - matchAll (with payload)', () => {
      manualMatchAll(manual_success, manual_cases);
    });

  console.log(`\n${colors.cyan}⏳ matchAll${colors.reset} ${progressBar(2, 5)}`);
  await match_all_bench.run();
  console.log(`${colors.green}✓${colors.reset} Terminé!`);

  results.push({
    name: '🔀 matchAll (empty)',
    taggedOps: match_all_bench.tasks[0]?.result?.hz ?? 0,
    manualOps: match_all_bench.tasks[1]?.result?.hz ?? 0,
  });
  results.push({
    name: '🔀 matchAll (payload)',
    taggedOps: match_all_bench.tasks[2]?.result?.hz ?? 0,
    manualOps: match_all_bench.tasks[3]?.result?.hz ?? 0,
  });

  // ---------------------------------------------------------------------------
  // Benchmark 3: matchSome
  // ---------------------------------------------------------------------------
  const match_some_bench = new Bench({ name: 'matchSome', time: BENCH_TIME });

  const tagged_some_cases = {
    Success: ({ data }: { data: number }) => `success: ${data}`,
    _default: () => 'other',
  };

  const manual_some_cases = {
    Success: ({ data }: { data: number; message: string }) => `success: ${data}`,
    _default: () => 'other',
  };

  match_some_bench
    .add('taggedEnum - matchSome (matched case)', () => {
      RemoteData.matchSome(tagged_success, tagged_some_cases);
    })
    .add('manual - matchSome (matched case)', () => {
      manualMatchSome(manual_success, manual_some_cases);
    })
    .add('taggedEnum - matchSome (default case)', () => {
      RemoteData.matchSome(tagged_idle, tagged_some_cases);
    })
    .add('manual - matchSome (default case)', () => {
      manualMatchSome(manual_idle, manual_some_cases);
    });

  console.log(`\n${colors.cyan}⏳ matchSome${colors.reset} ${progressBar(3, 5)}`);
  await match_some_bench.run();
  console.log(`${colors.green}✓${colors.reset} Terminé!`);

  results.push({
    name: '🎯 matchSome (matched)',
    taggedOps: match_some_bench.tasks[0]?.result?.hz ?? 0,
    manualOps: match_some_bench.tasks[1]?.result?.hz ?? 0,
  });
  results.push({
    name: '🎯 matchSome (default)',
    taggedOps: match_some_bench.tasks[2]?.result?.hz ?? 0,
    manualOps: match_some_bench.tasks[3]?.result?.hz ?? 0,
  });

  // ---------------------------------------------------------------------------
  // Benchmark 4: is() Type Guard
  // ---------------------------------------------------------------------------
  const is_bench = new Bench({ name: 'is() Type Guard', time: BENCH_TIME });

  const tagged_is_success = RemoteData.is('Success');
  const manual_is_success = manualIs('Success');

  is_bench
    .add('taggedEnum - is() (true)', () => {
      tagged_is_success(tagged_success);
    })
    .add('manual - is() (true)', () => {
      manual_is_success(manual_success);
    })
    .add('taggedEnum - is() (false)', () => {
      tagged_is_success(tagged_idle);
    })
    .add('manual - is() (false)', () => {
      manual_is_success(manual_idle);
    });

  console.log(`\n${colors.cyan}⏳ is() Type Guard${colors.reset} ${progressBar(4, 5)}`);
  await is_bench.run();
  console.log(`${colors.green}✓${colors.reset} Terminé!`);

  results.push({
    name: '🔍 is() (true)',
    taggedOps: is_bench.tasks[0]?.result?.hz ?? 0,
    manualOps: is_bench.tasks[1]?.result?.hz ?? 0,
  });
  results.push({
    name: '🔍 is() (false)',
    taggedOps: is_bench.tasks[2]?.result?.hz ?? 0,
    manualOps: is_bench.tasks[3]?.result?.hz ?? 0,
  });

  // ---------------------------------------------------------------------------
  // Benchmark 5: safeParse
  // ---------------------------------------------------------------------------
  const safe_parse_bench = new Bench({ name: 'safeParse', time: BENCH_TIME });

  const valid_data = { _tag: 'Success', data: 42, message: 'ok' };
  const invalid_data = { _tag: 'Success', data: 'not a number', message: 'ok' };

  safe_parse_bench
    .add('taggedEnum - safeParse (valid)', () => {
      RemoteData.schema.safeParse(valid_data);
    })
    .add('manual - safeParse (valid)', () => {
      manualSchema.safeParse(valid_data);
    })
    .add('taggedEnum - safeParse (invalid)', () => {
      RemoteData.schema.safeParse(invalid_data);
    })
    .add('manual - safeParse (invalid)', () => {
      manualSchema.safeParse(invalid_data);
    });

  console.log(`\n${colors.cyan}⏳ safeParse${colors.reset} ${progressBar(5, 5)}`);
  await safe_parse_bench.run();
  console.log(`${colors.green}✓${colors.reset} Terminé!`);

  results.push({
    name: '✅ safeParse (valid)',
    taggedOps: safe_parse_bench.tasks[0]?.result?.hz ?? 0,
    manualOps: safe_parse_bench.tasks[1]?.result?.hz ?? 0,
  });
  results.push({
    name: '✅ safeParse (invalid)',
    taggedOps: safe_parse_bench.tasks[2]?.result?.hz ?? 0,
    manualOps: safe_parse_bench.tasks[3]?.result?.hz ?? 0,
  });

  // ---------------------------------------------------------------------------
  // Summary with comparison
  // ---------------------------------------------------------------------------
  compareResults(results);
}

run_benchmarks().catch(console.error);
