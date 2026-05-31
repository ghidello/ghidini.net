---
title: 'Building This Blog: Choosing Astro as a Static Site Generator'
description: 'Why I chose Astro over Hugo and other static site generators for my personal developer blog, and how I set it up with Tailwind CSS v4, dark mode, and series support.'
pubDate: 2026-05-29
tags: [astro, tailwind, blog, static-site]
series: building-this-blog
seriesOrder: 1
---

## Why I Needed a Blog

I'm a software developer with a terrible memory. I constantly rediscover solutions to problems I've already solved, re-read documentation I've already parsed, and forget the clever workarounds I've figured out. This blog is my external brain — a place to document findings, write guides, and have a self-reference I can actually search.

## The Decision Process

I evaluated three static site generators:

### Hugo

- **Pros:** Blazing fast builds, mature ecosystem, great for content-heavy sites
- **Cons:** Go templates have a steep learning curve, Tailwind v4 integration requires an external build pipeline, limited component model

### Eleventy (11ty)

- **Pros:** Simple, flexible, JavaScript-based
- **Cons:** Less opinionated (which means more decisions), plugin-based MDX support, no built-in TypeScript

### Astro (winner)

- **Pros:** TypeScript-first, content collections with schema validation, native MDX, Tailwind v4 as a first-class Vite plugin, component islands for opt-in interactivity, zero JS shipped by default
- **Cons:** Younger ecosystem (though growing fast)

## Why Astro Won

The killer features for my use case:

1. **Content Collections** — Type-safe, schema-validated frontmatter. I defined a `series` field and `seriesOrder` in my schema, and Astro validates every post at build time. No more broken series because of a typo in frontmatter.

2. **Tailwind CSS v4** — The new CSS-first configuration (`@import "tailwindcss"`) means no `tailwind.config.js` file. Astro integrates it as a Vite plugin with one command: `npx astro add tailwind`.

3. **MDX** — the integration is installed, so I can drop interactive components straight into a post when one calls for it. The posts so far are plain Markdown, but the capability is there the moment I need it.

4. **Developer Experience** — Hot reload, TypeScript, familiar npm ecosystem. I'm not learning a new templating language.

## The Setup

The entire scaffold took a few commands:

```bash
# Create the project
npm create astro@latest -- . --template minimal --install --git --typescript strict -y

# Add integrations
npx astro add tailwind -y
npx astro add mdx -y
npx astro add sitemap -y
```

## What's Next

In the next posts in this series, I'll cover:

- Linting and formatting setup
- Lessons from the official Astro blog example
- Deployment and CI/CD setup
- Hardening: security headers, CSP automation, and GDPR-friendly comments

Stay tuned!
