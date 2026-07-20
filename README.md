# npm-bloat-detector

![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

**🌐 [Live demo →](https://npm-bloat-detector.vercel.app)**

> Find the five dependencies eating the most space in your install — real measured bytes, not guesses.

`npm-bloat-detector` walks your `node_modules`, measures the **actual on-disk size** of every declared dependency, and ranks the heaviest ones as a bar chart. Set a budget to gate CI, or diff against a saved baseline to catch the exact upgrade that doubled your install.

```
Top 5 of 47 dependencies by installed size
████████████████████   9.4 MB  next
██████████░░░░░░░░░░   4.8 MB  typescript
████████░░░░░░░░░░░░   3.9 MB  @swc/core
███░░░░░░░░░░░░░░░░░░   1.6 MB  react-dom
██░░░░░░░░░░░░░░░░░░░   1.1 MB  date-fns
Total: 38.2 MB across 47 deps
```

## For AI coding agents

Drop [`SKILL.md`](./SKILL.md) into your AI coding agent or editor and it learns how to use this tool — when to reach for it, the install + canonical command, the full set of flags, and the gotchas that are easy to miss.

## Install

```bash
pnpm add -g npm-bloat-detector
```

```bash
# npm / yarn work too
npm  install -g npm-bloat-detector
yarn global add npm-bloat-detector

# or run it once without installing
pnpm dlx npm-bloat-detector
```

> _Bleeding edge or before the first npm release: `pnpm add github:kea0811/npm-bloat-detector`._

Node **18+** is required.

## Quick example

Run it in any project with a `package.json` and an installed `node_modules`:

```bash
npm-bloat-detector
```

```
Top 5 of 12 dependencies by installed size
████████████████████  182.0 KB  commander
██░░░░░░░░░░░░░░░░░░░   18.4 KB  picocolors
█░░░░░░░░░░░░░░░░░░░░    9.1 KB  mri
░░░░░░░░░░░░░░░░░░░░       0 B   left-pad (not installed)
Total: 209.5 KB across 12 deps
```

Bars are scaled to the heaviest dependency. Anything declared but missing from `node_modules` is flagged `(not installed)`.

## Usage

```
npm-bloat-detector [dir] [options]
```

`dir` is the project directory to scan (defaults to the current directory).

### Options

| Flag                 | Description                                                        |
| -------------------- | ------------------------------------------------------------------ |
| `-t, --top <n>`      | How many dependencies to list (default `5`).                       |
| `-d, --dev`          | Include `devDependencies` in the scan.                             |
| `-j, --json`         | Print machine-readable JSON instead of the bar chart.              |
| `-b, --budget <size>`| Exit non-zero if the total exceeds this size (e.g. `50mb`, `1.5gb`).|
| `--baseline <file>`  | Diff installed sizes against a saved baseline JSON.                |
| `--save <file>`      | Write the current sizes to a baseline JSON.                        |
| `--no-color`         | Disable ANSI colors (also honors the `NO_COLOR` env var).          |
| `-V, --version`      | Print the version.                                                 |
| `-h, --help`         | Show help with examples.                                           |

### Budget gate

Great as a one-liner in CI — it prints the report and exits `1` when you're over budget:

```bash
npm-bloat-detector --budget 50mb
```

```
✗ 61.4 MB across 47 deps exceeds the 50.0 MB budget
```

### Watch a dependency over time

Snapshot the current sizes, then diff against them after an upgrade:

```bash
npm-bloat-detector --save .bloat.json
# ...bump some packages...
npm-bloat-detector --baseline .bloat.json
```

Each row picks up a delta: **red** when a dependency grew, **green** when it shrank, and `new` for anything that wasn't in the baseline.

## Programmatic API

Everything the CLI does is exported, so you can wire it into your own scripts:

```ts
import { analyze, buildReport, renderReport, createColors } from 'npm-bloat-detector';

const deps = analyze({ cwd: process.cwd(), includeDev: false });
const report = buildReport(deps, { top: 5, root: process.cwd() });

console.log(renderReport(report, { colors: createColors(true), json: false, baseline: false }));
```

| Export             | What it does                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `analyze(options)` | Measure every declared dependency's installed size.                 |
| `buildReport(...)` | Sort, slice to the top _n_, and attach baseline deltas.             |
| `renderReport(...)`| Render a report as a colored bar chart or JSON.                     |
| `directorySize`    | Sum the real bytes under a directory (symlinks skipped).            |
| `formatBytes`      | Human-friendly byte formatting (`5.0 MB`).                          |
| `parseSize`        | Parse a size budget (`"50mb"` → bytes).                             |

## How it measures

It resolves each package's install symlink (both pnpm and npm link the top-level entry into a store) and sums the real files the package ships. Nested symlinks are skipped, so shared dependencies are never double-counted and there are no infinite loops — you get a stable "bytes this package contributes" number every run.

## Contributing

```bash
pnpm install
pnpm test          # run the suite
pnpm test:coverage # run with coverage (100% is enforced)
pnpm build         # bundle with tsup
```

Issues and PRs welcome.

## License

[MIT](./LICENSE) © kea0811
