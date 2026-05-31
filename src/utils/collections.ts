import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

// Timezone used to decide when a dated post becomes "published". A static build
// is a snapshot, so scheduled posts only appear once a build runs on/after their
// date — pair this with a daily Cloudflare cron that triggers a rebuild.
const PUBLISH_TIME_ZONE = 'Europe/Rome';

/** Current calendar date in the publishing timezone, formatted as YYYY-MM-DD. */
function todayInPublishZone(): string {
  // 'en-CA' renders dates as YYYY-MM-DD, which compares lexicographically.
  return new Intl.DateTimeFormat('en-CA', { timeZone: PUBLISH_TIME_ZONE }).format(new Date());
}

/** The calendar date an author wrote in frontmatter, as YYYY-MM-DD. */
function pubDateKey(date: Date): string {
  // pubDate is parsed as UTC midnight, so its UTC components equal what was typed.
  return date.toISOString().slice(0, 10);
}

/**
 * Whether a post should be included in the build: not a draft, and its pubDate
 * is today or earlier in the publishing timezone. Future-dated posts are hidden
 * until a build runs on/after that date.
 */
export function isPublished(data: { draft?: boolean; pubDate: Date }): boolean {
  if (data.draft) return false;
  return pubDateKey(data.pubDate) <= todayInPublishZone();
}

export async function getSortedBlogPosts() {
  return (await getCollection('blog', ({ data }) => isPublished(data))).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export async function getSortedGuides() {
  return (await getCollection('guides', ({ data }) => isPublished(data))).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

/** Average adult silent reading speed (words per minute) for technical prose. */
const WORDS_PER_MINUTE = 200;

/**
 * Estimated reading time in whole minutes (minimum 1) for a body of Markdown.
 * Markdown syntax is stripped roughly so code fences and symbols don't inflate
 * the word count.
 */
export function getReadingTime(body: string | undefined): number {
  if (!body) return 1;
  const text = body
    .replace(/```[\s\S]*?```/g, ' ') // fenced code blocks
    .replace(/`[^`]*`/g, ' ') // inline code
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ') // links / images
    .replace(/[#>*_~`-]/g, ' '); // residual markdown punctuation
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * Posts most related to `current`, ranked by shared series (weighted heavily)
 * and shared tags. Excludes the current post and any unpublished/future posts.
 */
export async function getRelatedPosts(
  current: CollectionEntry<'blog'>,
  limit = 3,
): Promise<CollectionEntry<'blog'>[]> {
  const posts = await getSortedBlogPosts();
  const currentTags = new Set(current.data.tags);

  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      let score = 0;
      if (current.data.series && post.data.series === current.data.series) score += 5;
      for (const tag of post.data.tags) if (currentTags.has(tag)) score += 1;
      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf(),
    )
    .slice(0, limit)
    .map((entry) => entry.post);
}
