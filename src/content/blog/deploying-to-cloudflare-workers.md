---
title: 'Deploying to Cloudflare Workers'
description: 'How I set up automatic deployment of this static Astro blog to Cloudflare Workers with CI/CD via Workers Builds — free, fast, and zero-config after setup.'
pubDate: 2026-05-29
tags: [astro, cloudflare, deployment, ci-cd]
series: building-this-blog
seriesOrder: 4
---

## Why Cloudflare?

For a static blog, the hosting choice comes down to a few things: cost, speed, simplicity, and how much I have to think about it after the initial setup. I evaluated four options:

| Platform         | Free tier                              | Auto-deploy | Edge CDN | Notes                                  |
| ---------------- | -------------------------------------- | ----------- | -------- | -------------------------------------- |
| Cloudflare Workers | Unlimited bandwidth, 500 builds/month | Yes         | Yes      | Cookie-free analytics available        |
| Netlify          | 100GB/month, 300 build min             | Yes         | Yes      | More mature plugin ecosystem           |
| GitHub Pages     | Unlimited for public repos             | Yes         | Limited  | No redirects, no analytics, simplest   |
| Vercel           | 100GB/month, 6000 min                  | Yes         | Yes      | Next.js-focused, overkill for static   |

**Cloudflare won** because:

1. **Truly unlimited bandwidth** — no surprise bills if a post goes viral
2. **Fastest global CDN** — Cloudflare's edge network is massive
3. **Cookie-free Web Analytics** — no consent banner needed, GDPR stays simple
4. **Workers Builds** — push to `main`, site updates in ~30 seconds
5. **I already use Cloudflare for DNS** — one fewer account to manage

## The Setup

The Astro docs have a dedicated guide: [Deploy your Astro Site to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/). Cloudflare's own docs cover the Workers static assets side: [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

Here's what I did.

### Step 1: Install Wrangler

[Wrangler](https://developers.cloudflare.com/workers/wrangler/) is Cloudflare's CLI for managing Workers projects.

```bash
npm install wrangler@latest --save-dev --save-exact
```

### Step 2: Create the Wrangler configuration

Since this is a **static site** (no SSR, no server-side code), we don't need the `@astrojs/cloudflare` adapter. We just tell Wrangler to serve the `dist/` folder as static assets.

I created a `wrangler.jsonc` at the project root:

```jsonc
{
  "name": "ghidini-net",
  "compatibility_date": "2026-05-29",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page"
  }
}
```

Key points:

- **`name`** — identifies the Worker in your Cloudflare dashboard
- **`compatibility_date`** — pins the Workers runtime behavior to a specific date (prevents breaking changes)
- **`assets.directory`** — points to Astro's build output
- **`not_found_handling: "404-page"`** — serves our custom `404.astro` page instead of a generic Cloudflare error

### Step 3: Create a 404 page

Since we configured `not_found_handling`, we need an actual 404 page at `src/pages/404.astro`. Astro builds this to `/404.html`, which Cloudflare serves for any unmatched route.

### Step 4: Add deploy scripts

I added two npm scripts for convenience:

```json
{
  "scripts": {
    "deploy": "astro build && wrangler deploy",
    "deploy:preview": "astro build && wrangler dev"
  }
}
```

- `npm run deploy:preview` — builds and serves locally via Wrangler (tests the exact Cloudflare behavior)
- `npm run deploy` — builds and pushes to production

### Step 5: Set up Workers Builds (CI/CD)

This is the "set it and forget it" part. Instead of running `npm run deploy` manually, we let Cloudflare build and deploy on every push to `main`.

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/)
2. Navigate to **Compute → Workers & Pages**
3. Click **Create application**
4. Under **Import a repository**, connect your GitHub account
5. Select the `ghidini-net` repository
6. Configure:
   - **Build command:** `npx astro build`
   - **Deploy command:** `npx wrangler deploy`
7. Click **Save and Deploy**

That's it. Every push to `main` triggers a build. Cloudflare gives you a `*.workers.dev` subdomain immediately.

### Step 6: Connect your custom domain

Once the Worker is deployed:

1. In the Cloudflare dashboard, go to your Worker's settings
2. Under **Triggers → Custom Domains**, add `ghidini.net` and `www.ghidini.net`
3. Since the domain's DNS is already on Cloudflare, it routes automatically — no DNS changes needed
4. SSL is provisioned automatically

## What We Didn't Need

Since this is a fully static site:

- ❌ **No `@astrojs/cloudflare` adapter** — that's for on-demand (SSR) rendering
- ❌ **No `wrangler.toml`** — the newer `wrangler.jsonc` format is cleaner and supports comments
- ❌ **No GitHub Actions** — Workers Builds handles CI/CD natively, no extra YAML workflows
- ❌ **No environment variables** — everything is baked in at build time

## Testing Locally

Before deploying, you can verify the exact Cloudflare behavior locally:

```bash
npm run deploy:preview
```

This runs Wrangler's local dev server, which emulates the Workers runtime. It'll catch issues like missing assets or incorrect routing that `astro preview` might not surface.

## Cost

For a static blog like this: **$0/month**. The free tier includes:

- 100,000 requests/day
- Unlimited bandwidth
- 500 builds/month (Workers Builds)
- Global CDN
- Web Analytics (optional, cookie-free)

You'd need a _very_ popular blog to hit these limits.

## References

- [Astro: Deploy to Cloudflare](https://docs.astro.build/en/guides/deploy/cloudflare/) — official Astro deployment guide
- [Cloudflare: Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) — how Cloudflare serves static files from Workers
- [Cloudflare: Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) — CI/CD setup documentation
- [Cloudflare: Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) — wrangler.jsonc reference
