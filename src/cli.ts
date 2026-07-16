import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command, type CommanderError } from 'commander';
import { analyze } from './analyze.js';
import { createColors } from './color.js';
import { formatBytes, parseSize } from './format.js';
import { buildReport } from './report.js';
import { renderReport } from './render.js';
import type { Baseline, DepSize } from './types.js';

/** The current version, surfaced through `--version`. */
export const VERSION = '0.1.0';

/** Hooks the test suite swaps in; production code falls back to real I/O. */
export interface RunDeps {
  log?: (message: string) => void;
  error?: (message: string) => void;
  cwd?: string;
  env?: Record<string, string | undefined>;
}

interface CliOptions {
  top: string;
  dev?: boolean;
  json?: boolean;
  budget?: string;
  baseline?: string;
  save?: string;
  color?: boolean;
}

interface ExecuteContext {
  log: (message: string) => void;
  error: (message: string) => void;
  cwd: string;
  env: Record<string, string | undefined>;
}

const DESCRIPTION =
  'Find the dependencies eating the most space in your install — real measured bytes.';

const HELP_EXAMPLES = `
Examples:
  $ npm-bloat-detector
  $ npm-bloat-detector ./packages/app --top 10
  $ npm-bloat-detector --dev --json
  $ npm-bloat-detector --budget 50mb
  $ npm-bloat-detector --save .bloat.json
  $ npm-bloat-detector --baseline .bloat.json
`;

const trimTrailingNewline = (text: string): string => text.replace(/\n+$/, '');

function loadBaseline(file: string, cwd: string): Baseline {
  return JSON.parse(readFileSync(resolve(cwd, file), 'utf8')) as Baseline;
}

function saveBaseline(file: string, cwd: string, sizes: { name: string; bytes: number }[]): void {
  const data: Baseline = {};
  for (const size of sizes) {
    data[size.name] = size.bytes;
  }
  writeFileSync(resolve(cwd, file), `${JSON.stringify(data, null, 2)}\n`);
}

function execute(dir: string, options: CliOptions, ctx: ExecuteContext): number {
  const colorsEnabled = options.color !== false && !ctx.env.NO_COLOR;
  const colors = createColors(colorsEnabled);
  const root = resolve(ctx.cwd, dir);

  const top = Number.parseInt(options.top, 10);
  if (!Number.isFinite(top) || top < 1) {
    ctx.error(colors.red(`Invalid --top value: "${options.top}" (expected a positive integer)`));
    return 1;
  }

  let budget: number | undefined;
  if (options.budget !== undefined) {
    try {
      budget = parseSize(options.budget);
    } catch (err) {
      ctx.error(colors.red((err as Error).message));
      return 1;
    }
  }

  let baseline: Baseline | undefined;
  if (options.baseline !== undefined) {
    try {
      baseline = loadBaseline(options.baseline, ctx.cwd);
    } catch (err) {
      ctx.error(colors.red(`Could not read baseline: ${(err as Error).message}`));
      return 1;
    }
  }

  let deps: DepSize[];
  try {
    deps = analyze({ cwd: root, includeDev: options.dev === true });
  } catch (err) {
    ctx.error(colors.red((err as Error).message));
    return 1;
  }

  if (options.save !== undefined) {
    saveBaseline(options.save, ctx.cwd, deps);
  }

  const report = buildReport(deps, { top, baseline, root });
  ctx.log(
    renderReport(report, {
      colors,
      json: options.json === true,
      baseline: baseline !== undefined,
    }),
  );

  if (budget !== undefined) {
    const headline = `${formatBytes(report.total)} across ${report.totalCount} deps`;
    if (report.total > budget) {
      ctx.error(colors.red(`✗ ${headline} exceeds the ${formatBytes(budget)} budget`));
      return 1;
    }
    ctx.log(colors.green(`✓ ${headline} is within the ${formatBytes(budget)} budget`));
  }

  return 0;
}

/**
 * Parse `argv` (user args, without `node` and the script path) and run the CLI.
 * Returns the process exit code. All I/O is injectable via {@link RunDeps}.
 */
export async function run(argv: string[], deps: RunDeps = {}): Promise<number> {
  const log = deps.log ?? ((message) => process.stdout.write(`${message}\n`));
  const error = deps.error ?? ((message) => process.stderr.write(`${message}\n`));
  const ctx: ExecuteContext = {
    log,
    error,
    cwd: deps.cwd ?? process.cwd(),
    env: deps.env ?? process.env,
  };

  const program = new Command();
  program
    .name('npm-bloat-detector')
    .description(DESCRIPTION)
    .version(VERSION, '-V, --version')
    .argument('[dir]', 'project directory to analyze (defaults to the current directory)', '.')
    .option('-t, --top <n>', 'how many dependencies to list', '5')
    .option('-d, --dev', 'include devDependencies in the scan')
    .option('-j, --json', 'print machine-readable JSON instead of a bar chart')
    .option('-b, --budget <size>', 'exit non-zero if the total exceeds this size (e.g. 50mb)')
    .option('--baseline <file>', 'diff installed sizes against a saved baseline JSON')
    .option('--save <file>', 'write the current sizes to a baseline JSON')
    .option('--no-color', 'disable ANSI colors')
    .addHelpText('after', HELP_EXAMPLES)
    .exitOverride()
    .configureOutput({
      writeOut: (text) => log(trimTrailingNewline(text)),
      writeErr: (text) => error(trimTrailingNewline(text)),
    });

  let exitCode = 0;
  program.action((dir: string, options: CliOptions) => {
    exitCode = execute(dir, options, ctx);
  });

  try {
    program.parse(argv, { from: 'user' });
  } catch (err) {
    // exitOverride() turns help/version/parse failures into a thrown
    // CommanderError, which always carries a numeric exit code.
    return (err as CommanderError).exitCode;
  }
  return exitCode;
}
