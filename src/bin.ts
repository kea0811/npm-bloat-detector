#!/usr/bin/env node
import { run } from './cli.js';

// When output is piped to a process that exits early (e.g. `| head`), writing to
// a closed stdout throws EPIPE. Exit quietly instead of crashing with a stack trace.
process.stdout.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

run(process.argv.slice(2)).then((code) => {
  if (code !== 0) process.exitCode = code;
});
