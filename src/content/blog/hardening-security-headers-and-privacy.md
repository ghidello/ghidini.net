---
title: 'Hardening the Blog: Security Headers, CSP Automation, and GDPR-Friendly Comments'
description: 'How I locked down this static Astro blog with a strict Content Security Policy, automated CSP hashing as a post-build step, self-hosted fonts, and click-to-load Giscus comments that respect GDPR.'
pubDate: 2026-05-31
tags: [astro, security, csp, gdpr, cloudflare]
series: building-this-blog
seriesOrder: 5
---

## Why a Static Blog Still Needs Hardening

The blog was deployed and working, but "it loads" isn't the same as "it's secure and respectful of visitors." A static site has no server-side attack surface, yet it can still leak data to third parties, ship a permissive Content Security Policy, or set cookies a visitor never agreed to.

This post covers the four things I did to fix that:

1. Security headers (CSP, HSTS, and friends) served by Cloudflare
2. A post-build script that keeps CSP inline-script hashes in sync automatically
3. Self-hosting fonts so the browser never phones home to Google
4. Click-to-load comments so nothing contacts a third party without consent

## 1. Security Headers via Cloudflare `_headers`

Cloudflare Workers (and Pages) serve any file named `_headers` from the build output as a rule set. Astro copies everything in `public/` into `dist/`, so a single [public/\_headers](https://developers.cloudflare.com/workers/static-assets/headers/) file is all it takes.

```
/*
  Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' __INLINE_SCRIPT_HASHES__ https://giscus.app; connect-src 'self' https://giscus.app; frame-src https://giscus.app; manifest-src 'self'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()
```

A few decisions worth calling out:

- **`default-src 'self'`** — deny by default, then open up only what's needed. The only third party allowed anywhere is `giscus.app` (comments), and only for `script-src`, `connect-src`, and `frame-src`.
- **`frame-ancestors 'none'` + `X-Frame-Options: DENY`** — no one can embed the site in an iframe (clickjacking protection).
- **`style-src 'unsafe-inline'`** — the one compromise. Astro and Tailwind emit small inline styles; hashing every one of them is brittle. Scripts are the higher-value target, so that's where I spent the effort.
- **`Strict-Transport-Security` with `preload`** — forces HTTPS for two years, including subdomains.
- **`Permissions-Policy`** — explicitly switches off browser features the blog never uses (camera, geolocation, USB, etc.).

That `__INLINE_SCRIPT_HASHES__` token is not a typo — it's a placeholder. Which brings us to the interesting part.

## 2. Automating CSP Hashes as a Post-Build Step

A strict `script-src` can't use `'unsafe-inline'`, so every inline `<script>` needs either a nonce or a hash. Static hosting rules out nonces (they must be unique per request, and there's no server generating them), so hashes it is.

The problem: Astro inlines small scripts — like the click-to-load Giscus handler — directly into the HTML. Every time that script's contents change, its `sha256` hash changes, and a hardcoded hash in the CSP would silently break. I did exactly that once, and the comments button stopped working with a console full of CSP violations.

The fix is a tiny post-build script, [scripts/inject-csp-hashes.mjs](https://github.com/ghidello/ghidini.net), that:

1. Walks every `.html` file in `dist/`
2. Extracts the body of each inline `<script>` (those without a `src`)
3. Computes its `sha256` hash, base64-encoded
4. Replaces the `__INLINE_SCRIPT_HASHES__` placeholder in `dist/_headers` with the real hashes

The core of it:

```js
import { createHash } from 'node:crypto';
import { readFile, writeFile, readdir } from 'node:fs/promises';

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

const hashes = new Set();
for (const file of await htmlFiles('dist')) {
  const html = await readFile(file, 'utf8');
  for (const body of inlineScripts(html)) {
    const digest = createHash('sha256').update(body, 'utf8').digest('base64');
    hashes.add(`'sha256-${digest}'`);
  }
}

const headers = await readFile('dist/_headers', 'utf8');
const replacement = hashes.size > 0 ? [...hashes].sort().join(' ') : "'none'";
await writeFile('dist/_headers', headers.replace('__INLINE_SCRIPT_HASHES__', replacement), 'utf8');
```

It's wired into the build script so it runs on every build — local, preview, and Cloudflare CI:

```json
{
  "scripts": {
    "build": "astro build && node scripts/inject-csp-hashes.mjs"
  }
}
```

Now editing an inline script needs zero manual hash bookkeeping. The hash is recomputed from the actual emitted HTML on the next build, so the CSP and the code can never drift apart.

> A note on the regex: parsing HTML with a regex is normally a bad idea. Here it's acceptable because the input is Astro's own deterministic output, not arbitrary user HTML, and the pattern only needs to match well-formed `<script>` tags. If that assumption ever breaks, a real HTML parser is the upgrade path.

## 3. Self-Hosting Fonts

In [post 3](/blog/learning-from-astro-blog-example/) I said I was skipping the Astro Font API and sticking with system fonts. I changed my mind — but did it the privacy-preserving way using Astro's experimental Fonts API, which **downloads and self-hosts** the font files at build time instead of linking to Google's CDN at runtime:

```js
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600, 700, 800, 900],
      styles: ['normal'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 500, 700],
      styles: ['normal'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
});
```

Even though the provider is `google()`, the fonts are fetched during the build and served from my own origin. That's why `font-src 'self'` in the CSP is enough — at runtime the browser never contacts `fonts.googleapis.com` or `fonts.gstatic.com`, so there's no third-party request and no GDPR concern about leaking IP addresses to Google.

## 4. GDPR-Friendly Click-to-Load Comments

Comments are powered by [Giscus](https://giscus.app), which embeds an iframe backed by GitHub Discussions. The catch: loading that iframe contacts `giscus.app` and `github.com`, transmitting the visitor's IP and potentially setting cookies — before the visitor has done anything.

To keep consent explicit, I don't load Giscus automatically. The [Giscus component](https://github.com/ghidello/ghidini.net) renders a placeholder with a "Load comments" button and a short explanation. The third-party script is only injected after a click:

```ts
loadBtn?.addEventListener('click', () => {
  const d = loadBtn.dataset;
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.setAttribute('data-repo', d.repo ?? '');
  s.setAttribute('data-repo-id', d.repoId ?? '');
  // ...remaining data-* attributes copied from the button...
  s.setAttribute('crossorigin', 'anonymous');
  s.async = true;
  document.querySelector('.giscus')?.appendChild(s);
  placeholder?.remove();
});
```

The configuration lives in `src/consts.ts` and is passed to the button as `data-*` attributes, so the click handler stays generic. Until the visitor clicks, nothing leaves the page — which is exactly what the privacy policy promises.

This is also the inline script whose hash the post-build step computes. The two features are connected: the click-to-load handler is small enough that Astro inlines it, which is precisely why automating the CSP hash (section 2) was worth the effort.

## Verifying It

After deploying, I checked the headers with `curl` and a CSP evaluator:

```bash
curl -sI https://ghidini.net | grep -i content-security-policy
```

Tools like the [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) and [securityheaders.com](https://securityheaders.com) give a quick external grade and flag anything missing.

## Takeaways

"Static" doesn't mean "nothing to secure." The wins here were cheap and durable:

- A single `_headers` file gives a strict, deny-by-default CSP plus HSTS and the usual hardening headers.
- A 60-line post-build script makes the CSP self-maintaining, so inline scripts can change freely.
- Self-hosting fonts and gating third-party comments behind a click means the blog doesn't leak visitor data to anyone they didn't agree to.

That wraps the **building this blog** series. From choosing Astro to deploying on Cloudflare to locking it down — it's now the searchable external brain I set out to build.
