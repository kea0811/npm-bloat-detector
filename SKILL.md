---
name: npm-bloat-detector
description: Use when a user wants to find which dependencies are the largest, why node_modules or their install is so big, or wants a CI gate on install/bundle size — a Node 18+ CLI that measures the real on-disk size of every dependency and ranks the heaviest. Also exposes a programmatic API.
---

# npm-bloat-detector

Reach for this when someone wants to know **which dependencies are the biggest** and by how much. It walks `node_modules`, measures the actual on-disk bytes of every declared dependency (resolving pnpm/npm install symlinks), and prints a ranked bar chart. It can gate CI against a size budget and diff two runs against a baseline.

## When to reach for this

User says:
- "What's making my `node_modules` so huge?"
- "Which dependencies are the heaviest / eating the most space?"
- "Fail my build if the install gets too big."
- "Did that upgrade blow up my bundle? Show me the diff."

User does NOT mean this when they ask for:
- ❌ The gzipped/brotli size of a **built bundle file** — that's a bundle-cost or size-limit tool, not this. This measures installed packages on disk.
- ❌ A dependency **tree / why-is-this-installed** view — reach for `npm ls` / `pnpm why`.
- ❌ Finding **unused** dependencies — that's depcheck / knip.

## Install

```bash
pnpm add -g npm-bloat-detector   # or: pnpm dlx npm-bloat-detector (no install)
```

Requires Node 18+.

## Most common pattern (95% of cases)

```bash
# top 5 heaviest deps in the current project
npm-bloat-detector

# CI gate: non-zero exit when the install exceeds a budget
npm-bloat-detector --budget 50mb
```

Programmatic use:

```ts
import { analyze, buildReport, renderReport, createColors } from 'npm-bloat-detector';

const deps = analyze({ cwd: process.cwd(), includeDev: false });
const report = buildReport(deps, { top: 5, root: process.cwd() });
console.log(renderReport(report, { colors: createColors(false), json: false, baseline: false }));
```

## API / flags

| Flag                  | What it does                                                    |
| --------------------- | -------------------------------------------------------------- |
| `[dir]`               | Project directory to scan (default: current directory).        |
| `-t, --top <n>`       | How many dependencies to list (default `5`).                   |
| `-d, --dev`           | Include `devDependencies`.                                     |
| `-j, --json`          | Machine-readable JSON instead of the bar chart.                |
| `-b, --budget <size>` | Exit non-zero if the total exceeds this size (`50mb`, `1.5gb`).|
| `--baseline <file>`   | Diff installed sizes against a saved baseline JSON.            |
| `--save <file>`       | Write the current sizes to a baseline JSON.                    |
| `--no-color`          | Disable ANSI colors (also honors `NO_COLOR`).                  |

## Gotchas worth knowing

1. It measures each package's **own files** with nested symlinks skipped — so shared transitive deps aren't double-counted. The number is "bytes this package contributes," not the full transitive closure.
2. A dependency declared in `package.json` but missing from `node_modules` shows up with `0 B` and a `(not installed)` tag — run your install first for accurate totals.
3. `--budget` compares against the total across **all** measured deps, not just the top _n_ shown.

## Links

- npm / install: `pnpm add -g npm-bloat-detector`
- repo: https://github.com/kea0811/npm-bloat-detector
