import { getCollection } from 'astro:content';

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
