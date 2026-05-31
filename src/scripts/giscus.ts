// Click-to-load handler for the giscus comments widget. Astro inlines this
// small script into each page as a `<script type="module">`. Its CSP hash is
// computed automatically after every build by scripts/inject-csp-hashes.mjs and
// injected into dist/_headers, so editing this file needs no manual hash update.
const loadBtn = document.getElementById('giscus-load') as HTMLButtonElement | null;
const placeholder = document.getElementById('giscus-placeholder');

loadBtn?.addEventListener('click', () => {
  const d = loadBtn.dataset;
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.setAttribute('data-repo', d.repo ?? '');
  s.setAttribute('data-repo-id', d.repoId ?? '');
  s.setAttribute('data-category', d.category ?? '');
  s.setAttribute('data-category-id', d.categoryId ?? '');
  s.setAttribute('data-mapping', d.mapping ?? '');
  s.setAttribute('data-strict', '1');
  s.setAttribute('data-reactions-enabled', d.reactionsEnabled ?? '');
  s.setAttribute('data-emit-metadata', '0');
  s.setAttribute('data-input-position', d.inputPosition ?? '');
  s.setAttribute('data-theme', d.theme ?? '');
  s.setAttribute('data-lang', d.lang ?? '');
  s.setAttribute('crossorigin', 'anonymous');
  s.async = true;
  document.querySelector('.giscus')?.appendChild(s);
  placeholder?.remove();
});
