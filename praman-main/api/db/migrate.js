import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TABLES = ['beneficiary', 'facility', 'grant', 'inspection', 'evidence', 'assignment', 'vc_log', 'audit_log'];

export function migrate(dir = process.env.PRAMAN_DATA_DIR ?? path.join(here, 'data')) {
  fs.mkdirSync(dir, { recursive: true });
  for (const t of TABLES) {
    const f = path.join(dir, t + '.json');
    if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
  }
  return dir;
}

const direct = process.argv[1] ? path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)) : false;
if (direct) {
  migrate();
  console.log('migrate done');
}
