// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'The Flux Capacitor';
export const SITE_DESCRIPTION =
  'A software development blog by Alessandro Ghidini — findings, guides, and things I keep forgetting.';
export const SITE_URL = 'https://ghidini.net';

// Author / identity, used for bylines and structured data (schema.org).
export const SITE_AUTHOR = 'Alessandro Ghidini';
export const AUTHOR = {
  name: 'Alessandro Ghidini',
  url: SITE_URL,
  // Profiles used for schema.org `sameAs` to strengthen entity identity.
  sameAs: [
    'https://github.com/ghidello',
    'https://x.com/ghidello',
    'https://www.linkedin.com/in/alessandroghidini/',
  ],
};

// Giscus comments configuration.
// Generate these values at https://giscus.app after enabling GitHub Discussions
// on the repository and installing the giscus app.
export const GISCUS = {
  repo: 'ghidello/ghidini.net',
  repoId: 'R_kgDOSrN4hA', // e.g. 'R_kgD...'
  category: 'Announcements',
  categoryId: 'DIC_kwDOSrN4hM4C-Opq', // e.g. 'DIC_kwD...'
  mapping: 'pathname',
  reactionsEnabled: '1',
  inputPosition: 'top',
  theme: 'transparent_dark',
  lang: 'en',
};
