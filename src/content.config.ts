import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // Local images (under src/) go through Astro's optimization pipeline.
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
      author: z.string().default('Alessandro Ghidini'),
      tags: z.array(z.string()).default([]),
      series: z.string().optional(),
      seriesOrder: z.number().optional(),
      draft: z.boolean().default(false),
    }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    topic: z.string(),
    author: z.string().default('Alessandro Ghidini'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, guides };
