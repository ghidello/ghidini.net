// Post-build step: compute CSP hashes for every inline <script> Astro emitted
// into the built HTML and inject them into dist/_headers, replacing the
// `__INLINE_SCRIPT_HASHES__` placeholder in the script-src directive.
//
// This keeps the Content-Security-Policy in sync automatically: whenever an
// inline script's contents change (e.g. src/scripts/giscus.ts), its hash is
// recomputed on the next build with no manual edits required.
//
// Run automatically as part of `npm run build`.
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const HEADERS_FILE = join(DIST, '_headers');
const PLACEHOLDER = '__INLINE_SCRIPT_HASHES__';

/** Recursively collect all .html files under a directory. */
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return htmlFiles(path);
      return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
    }),
  );
  return files.flat();
}

/** Extract the body of every inline <script> (those without a src attribute). */
function inlineScripts(html) {
  const scripts = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    if (match[1].length > 0) scripts.push(match[1]);
  }
  return scripts;
}

const files = await htmlFiles(DIST);
const hashes = new Set();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  for (const body of inlineScripts(html)) {
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.add(`'sha256-${digest}'`);
  }
}

const headers = await readFile(HEADERS_FILE, 'utf8');
if (!headers.includes(PLACEHOLDER)) {
  console.warn(`[csp] placeholder ${PLACEHOLDER} not found in ${HEADERS_FILE}; skipping.`);
  process.exit(0);
}

const replacement = hashes.size > 0 ? [...hashes].sort().join(' ') : "'none'";
await writeFile(HEADERS_FILE, headers.replace(PLACEHOLDER, replacement), 'utf8');
console.log(`[csp] injected ${hashes.size} inline-script hash(es) into ${HEADERS_FILE}`);
