# npm-bloat-detector

![tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

> Find the five dependencies eating the most space in your install — real measured bytes, not guesses.

`npm-bloat-detector` walks your `node_modules`, measures the **actual on-disk size** of every declared dependency, and shows you the heaviest ones with a bar chart. Set a budget to gate CI, or diff against a saved baseline to catch the exact upgrade that doubled your install.

## Install

```bash
pnpm add -g npm-bloat-detector
```

> _Bleeding edge or before the first npm release: `pnpm add github:kea0811/npm-bloat-detector`._

More docs coming soon.
