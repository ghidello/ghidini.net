import { OGImageRoute } from 'astro-og-canvas';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../consts';
import { isPublished } from '../../utils/collections';

const blog = await getCollection('blog', ({ data }) => isPublished(data));
const guides = await getCollection('guides', ({ data }) => isPublished(data));

// Map every generated card to a route under /open-graph/<key>.png.
const pages: Record<string, { title: string; description: string }> = {
  site: { title: SITE_TITLE, description: SITE_DESCRIPTION },
};
for (const entry of blog) {
  pages[`blog/${entry.id}`] = {
    title: entry.data.title,
    description: entry.data.description,
  };
}
for (const entry of guides) {
  pages[`guides/${entry.id}`] = {
    title: entry.data.title,
    description: entry.data.description,
  };
}

export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'route',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    bgGradient: [[10, 10, 12]],
    border: { color: [0, 243, 255], width: 16, side: 'inline-start' },
    padding: 70,
    font: {
      title: {
        color: [240, 240, 245],
        size: 64,
        weight: 'ExtraBold',
        lineHeight: 1.1,
      },
      description: {
        color: [170, 180, 195],
        size: 30,
        lineHeight: 1.4,
      },
    },
  }),
});
