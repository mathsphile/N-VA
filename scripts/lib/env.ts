/*
 * Shared .env(.local) loader for NØVA scripts — no dependency, no logging
 * of values. Only sets variables that are not already defined.
 */

import fs from 'node:fs';
import path from 'node:path';

export function loadEnvFiles(cwd: string = process.cwd()): void {
  for (const file of ['.env.local', '.env']) {
    const p = path.resolve(cwd, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      const key = match?.[1];
      if (key && process.env[key] === undefined) {
        process.env[key] = (match?.[2] ?? '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
}
