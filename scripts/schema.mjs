import { readFileSync, writeFileSync } from 'node:fs';
const s = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
writeFileSync(new URL('../db/schema.ts', import.meta.url), '// Generated from db/schema.sql by `npm run schema`. Inlined so serverless bundles need no fs read.\nexport const SCHEMA = ' + JSON.stringify(s) + ';\n');
