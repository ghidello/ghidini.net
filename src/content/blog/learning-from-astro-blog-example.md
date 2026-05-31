---
title: 'Learning from the Official Astro Blog Example'
description: 'How studying the official Astro blog template led me to add an RSS feed, extract site constants, and build a reusable date formatting component.'
pubDate: 2026-05-29
tags: [astro, rss, dx, refactoring]
series: building-this-blog
seriesOrder: 3
---

## Standing on the Shoulders of Giants

After getting the blog running with linting and formatting in place, I did what any sensible developer does — I looked at how the Astro team built _their_ example blog. The [official Astro blog template](https://github.com/withastro/astro/tree/main/examples/blog) is listed as an example in the Astro docs, and it's surprisingly instructive.

Here's what I stole — er, _learned_ — and applied to this blog.

## 1. RSS Feed with `@astrojs/rss`

The most impactful missing feature. An RSS feed lets readers subscribe without relying on social media algorithms. The official example includes a simple `rss.xml.js` endpoint:

```bash
npm install @astrojs/rss --save-exact
```

Then a page at `src/pages/rss.xml.js`:

```js
import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
```

That's it. Astro generates `/rss.xml` at build time. I also added a `<link>` tag in the `<head>` so browsers and feed readers can auto-discover it:

```html
<link rel="alternate" type="application/rss+xml" title={SITE_TITLE} href={new URL('rss.xml', Astro.site)} />
```

## 2. Site Constants File

I had "The Flux Capacitor" hardcoded in every page title. The official example exports constants from a single `src/consts.ts`:

```ts
export const SITE_TITLE = 'The Flux Capacitor';
export const SITE_DESCRIPTION =
  'A software development blog by Alessandro Ghidini — findings, guides, and things I keep forgetting.';
export const SITE_URL = 'https://ghidini.net';
```

Now every page imports and interpolates:

```astro
<BaseLayout title={`Blog - ${SITE_TITLE}`} />
```

One rename, one file to change. DRY wins.

## 3. FormattedDate Component

I was copying `toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })` all over the place — six files had their own date formatting. The official example extracts this into a tiny component:

```astro
---
interface Props {
  date: Date;
  format?: 'short' | 'long' | 'month-year';
}

const { date, format = 'short' } = Astro.props;

const options: Intl.DateTimeFormatOptions =
  format === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : format === 'month-year'
      ? { month: 'short', year: 'numeric' }
      : { year: 'numeric', month: 'short', day: 'numeric' };
---

<time datetime={date.toISOString()}>
  {date.toLocaleDateString('en-US', options)}
</time>
```

I extended theirs with a `format` prop to cover the different date displays I use (full dates on posts, short on listings, month+year on guides).

## 4. Sitemap `<link>` in `<head>`

We already had `@astrojs/sitemap` generating a sitemap, but the `<head>` didn't advertise it. A one-liner fix:

```html
<link rel="sitemap" href="/sitemap-index.xml" />
```

Crawlers can now discover the sitemap without needing `robots.txt`.

## What I Chose NOT to Adopt

Not everything from the official example made sense for this blog:

- **`image()` schema helper** — Their content schema uses Astro's image optimization pipeline for hero images. I don't have hero images yet, so this is parked for later.

(I originally parked the Astro Font API here too, but later adopted it to self-host fonts — see the [hardening post](/blog/hardening-security-headers-and-privacy/) at the end of this series.)

Both are tracked in `TODO.md` for when they become relevant.

## Takeaways

Studying reference implementations is underrated. In about 30 minutes of reading the official example, I identified five concrete improvements. The RSS feed alone makes the blog meaningfully more useful — it's how _I_ follow other blogs, so it would be hypocritical not to offer one.

The pattern here is simple: build something, then look at how experienced people built the same thing. You'll always find something you missed.
