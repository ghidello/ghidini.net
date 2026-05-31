// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = 'The Flux Capacitor';
export const SITE_DESCRIPTION =
  'A software development blog by Alessandro Ghidini — findings, guides, and things I keep forgetting.';
export const SITE_URL = 'https://ghidini.net';

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
} as const;
