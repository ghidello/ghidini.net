---
title: 'Drafts and Scheduled Posts on a Static Astro Site'
description: 'How I added draft and future-dated (scheduled) posts to this static Astro blog, and trigger a daily Cloudflare rebuild with a cron Worker so scheduled posts publish themselves.'
pubDate: 2026-05-31
tags: [astro, cloudflare, workers, ci-cd, content]
series: building-this-blog
seriesOrder: 6
---

## The Problem With "Publish Now or Never"

A static site builds once and freezes. That's great for speed, but it makes two ordinary blogging features awkward:

- **Drafts** — work-in-progress posts I don't want live yet.
- **Scheduled posts** — finished posts I want to appear on a future date without me being at a keyboard.

Both come down to one question: _which posts does a given build include?_ Here's how I solved it without leaving the static model.

## Drafts: A Frontmatter Flag

The content schema already had a `draft` boolean, defaulting to `false`:

```ts
draft: z.boolean().default(false),
```

A draft is excluded everywhere, so it generates no page at all — not even a direct URL. Flip it to publish:

```yaml
---
title: 'Something I'm still writing'
pubDate: 2026-06-01
draft: true
---
```

## Scheduled Posts: Compare `pubDate` to "Today"

For scheduling, the rule is simple: include a post only if it's not a draft **and** its `pubDate` is today or earlier. The subtlety is _whose_ "today" — a build server runs in UTC, but I think in Rome time. A post dated June 15 shouldn't appear during a build that happens at 23:00 UTC on June 14, which is already June 15 in Rome... or should it? I picked one timezone and made it explicit.

I centralized the logic in a single `isPublished` helper so every listing, page, tag, series, and RSS feed agrees:

```ts
// Timezone used to decide when a dated post becomes "published".
const PUBLISH_TIME_ZONE = 'Europe/Rome';

/** Current calendar date in the publishing timezone, as YYYY-MM-DD. */
function todayInPublishZone(): string {
  // 'en-CA' renders dates as YYYY-MM-DD, which compares lexicographically.
  return new Intl.DateTimeFormat('en-CA', { timeZone: PUBLISH_TIME_ZONE }).format(new Date());
}

/** The calendar date written in frontmatter, as YYYY-MM-DD. */
function pubDateKey(date: Date): string {
  // pubDate is parsed as UTC midnight, so its UTC components equal what was typed.
  return date.toISOString().slice(0, 10);
}

export function isPublished(data: { draft?: boolean; pubDate: Date }): boolean {
  if (data.draft) return false;
  return pubDateKey(data.pubDate) <= todayInPublishZone();
}
```

A couple of details that matter:

- **Compare calendar dates, not timestamps.** Astro parses `pubDate: 2026-06-15` as UTC midnight. Comparing the `YYYY-MM-DD` strings avoids off-by-one-day surprises from timezone math on the full `Date`.
- **`Intl.DateTimeFormat` with a `timeZone`** is the clean way to get "what day is it in Rome right now" without pulling in a date library.

Then `isPublished` replaces the old `!data.draft` check in the shared collection helpers...

```ts
export async function getSortedBlogPosts() {
  return (await getCollection('blog', ({ data }) => isPublished(data))).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}
```

...and in every other place that enumerates posts directly — the `[slug]` pages, tag pages, series index, and the series navigation component. The goal is that a future-dated post is invisible _everywhere_: no listing entry, no standalone page, no RSS item, no series link.

## The Missing Piece: Something Has to Rebuild

Here's the catch that's easy to miss. `isPublished` decides what a build includes — but a static site only re-evaluates it when a build actually runs. If the last build was yesterday, a post scheduled for today won't appear until _something_ triggers a new build.

[Workers Builds](/blog/deploying-to-cloudflare-workers/) rebuilds on every push to `main`, but I won't always push code on the day a post is due. I need a time-based trigger. With GitHub Actions you'd reach for a `schedule:` cron; Cloudflare doesn't cron the build directly, but it gives you two pieces that combine into the same thing:

1. **Deploy hooks** — a secret URL on the main Worker; POST to it and it runs a production build + deploy.
2. **Cron Triggers** — a scheduled Worker that runs on a cron expression.

So I made a tiny second Worker whose only job is to POST to the deploy hook once a day.

### The Cron Worker

It lives in its own folder (`worker-cron/`) with its own config, separate from the site's static-assets Worker:

```jsonc
// worker-cron/wrangler.jsonc
{
  "name": "ghidello-daily-rebuild",
  "main": "index.js",
  "compatibility_date": "2026-05-29",
  // 05:00 UTC daily ≈ 07:00 Europe/Rome (CEST), safely past Rome midnight.
  "triggers": {
    "crons": ["0 5 * * *"],
  },
}
```

```js
// worker-cron/index.js
export default {
  async scheduled(event, env, ctx) {
    if (!env.DEPLOY_HOOK_URL) {
      console.error('DEPLOY_HOOK_URL secret is not set; skipping rebuild trigger.');
      return;
    }
    const response = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    console.log(`Triggered daily rebuild: ${response.status} ${response.statusText}`);
  },
};
```

### Wiring It Up

1. In the main Worker's dashboard: **Settings → Builds → Deploy hooks → Create**. Copy the URL.
2. Store it as an encrypted secret on the cron Worker (never commit it — anyone with the URL can trigger builds):

   ```bash
   cd worker-cron
   npx wrangler secret put DEPLOY_HOOK_URL
   npx wrangler deploy
   ```

That's the whole mechanism. Every morning at 07:00 Rome time the cron Worker fires, the deploy hook runs `npm run build`, `isPublished` re-evaluates against today's date, and any post that just came due goes live — with me asleep.

### Why a Separate Worker?

The site is served by a static-assets Worker with no script of its own. Cron triggers need a `scheduled()` handler, so bolting one onto the assets Worker would mean introducing a script just to hold a cron. Keeping the scheduler as its own small Worker leaves the site deploy untouched and makes the cron easy to reason about, deploy, and disable independently.

### On the UTC vs. Rome Offset

Cron expressions run in **UTC**. `0 5 * * *` is 05:00 UTC, which is 07:00 in Rome during CEST (UTC+2) and 06:00 during CET (UTC+1) — both comfortably after Rome midnight, so a post dated "today" in Rome is always already publishable by the time the build runs. If you need minute-perfect midnight publishing you'd have to account for DST, but for a blog "sometime that morning" is plenty.

## Takeaways

Static sites can do drafts and scheduling — you just split the problem in two:

- **What to include** is a pure build-time decision: a `draft` flag plus a timezone-aware `pubDate` comparison, centralized in one `isPublished` helper so nothing drifts.
- **When to rebuild** is an operational decision: a once-a-day cron Worker that POSTs a deploy hook, standing in for the `schedule:` cron you'd write in GitHub Actions.

Together they give a static blog a writing workflow that feels dynamic: queue a post with a future date, close the laptop, and let the next morning's build publish it.

That wraps the **building this blog** series. From choosing Astro to deploying on Cloudflare, hardening it, and giving it a real publishing workflow — it's now the searchable external brain I set out to build.
