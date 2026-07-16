import type { Colors } from './color.js';
import { formatBytes, formatDelta } from './format.js';
import type { DepRow, Report } from './types.js';

export interface RenderOptions {
  /** The color palette to paint with. */
  colors: Colors;
  /** Emit JSON instead of the bar-chart table. */
  json: boolean;
  /** Show the baseline delta column. */
  baseline: boolean;
}

const BAR_WIDTH = 20;

function bar(bytes: number, max: number, colors: Colors): string {
  const filled = max > 0 ? Math.round((bytes / max) * BAR_WIDTH) : 0;
  return colors.cyan('█'.repeat(filled)) + colors.dim('░'.repeat(BAR_WIDTH - filled));
}

function renderDelta(delta: number | null, colors: Colors): string {
  if (delta === null) return colors.cyan('new');
  if (delta === 0) return colors.dim(formatDelta(0));
  const text = formatDelta(delta);
  // A dependency that grew is bad news (red); one that shrank is a win (green).
  return delta > 0 ? colors.red(text) : colors.green(text);
}

function renderRow(row: DepRow, max: number, options: RenderOptions): string {
  const { colors } = options;
  const size = colors.bold(formatBytes(row.bytes).padStart(9));
  let line = `${bar(row.bytes, max, colors)} ${size}  ${row.name}`;
  if (!row.installed) {
    line += colors.dim(' (not installed)');
  }
  if (options.baseline) {
    line += `  ${renderDelta(row.delta, colors)}`;
  }
  return line;
}

function renderTable(report: Report, options: RenderOptions): string {
  const { colors } = options;
  const heading =
    report.rows.length === 0
      ? 'No dependencies found.'
      : `Top ${report.shown} of ${report.totalCount} dependencies by installed size`;
  const max = report.rows.length > 0 ? report.rows[0].bytes : 0;

  const lines = [colors.bold(heading)];
  for (const row of report.rows) {
    lines.push(renderRow(row, max, options));
  }
  lines.push(colors.dim(`Total: ${formatBytes(report.total)} across ${report.totalCount} deps`));
  return lines.join('\n');
}

function renderJson(report: Report): string {
  return JSON.stringify(
    {
      root: report.root,
      total: report.total,
      totalCount: report.totalCount,
      dependencies: report.rows.map((row) => ({
        name: row.name,
        bytes: row.bytes,
        installed: row.installed,
        delta: row.delta,
      })),
    },
    null,
    2,
  );
}

/** Render a report as either a colored bar chart or a JSON document. */
export function renderReport(report: Report, options: RenderOptions): string {
  return options.json ? renderJson(report) : renderTable(report, options);
}
