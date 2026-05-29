---
title: 'Setting Up Linting and Formatting for Astro'
description: 'How I configured Prettier and ESLint for my Astro blog to keep code consistent and catch issues early — with Tailwind class sorting included.'
pubDate: 2026-05-29
tags: [astro, prettier, eslint, dx, tooling]
series: building-this-blog
seriesOrder: 2
---

## Why Bother?

Formatting and linting might seem like overkill for a personal blog, but here's why I set them up from day one:

1. **Consistency** — I don't want to think about semicolons, quotes, or indentation. Ever.
2. **Tailwind class ordering** — Tailwind utility classes can get long. Having them automatically sorted makes templates readable.
3. **Catch mistakes early** — ESLint with the Astro plugin catches issues specific to `.astro` files before they become runtime bugs.
4. **Good habits** — If I share code snippets on this blog, they should be well-formatted.

## Prettier: The Formatter

Astro recommends [Prettier](https://prettier.io/) with their official plugin. I also added the Tailwind plugin for automatic class sorting.

### Installation

```bash
npm install --save-dev --save-exact prettier prettier-plugin-astro prettier-plugin-tailwindcss
```

The `--save-exact` flag pins exact versions — Prettier recommends this to avoid formatting changes between patch releases breaking your CI.

### Configuration

`.prettierrc` at the project root:

```json
{
  "plugins": ["prettier-plugin-astro", "prettier-plugin-tailwindcss"],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ],
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 100
}
```

Key points:

- **`prettier-plugin-tailwindcss` must be last** in the plugins array — it needs to run after other plugins.
- The **`overrides`** block tells Prettier to use the Astro parser for `.astro` files.
- I chose single quotes and trailing commas — personal preference, pick what you like.

I also added a `.prettierignore` to skip generated files:

```
dist
node_modules
.astro
```

### Usage

```bash
# Format everything
npm run format

# Check without writing (useful for CI)
npm run format:check
```

## ESLint: The Linter

The community-maintained [eslint-plugin-astro](https://github.com/ota-meshi/eslint-plugin-astro) provides Astro-specific rules.

### Installation

```bash
npm install --save-dev --save-exact eslint eslint-plugin-astro @typescript-eslint/parser
```

### Configuration

`eslint.config.mjs` (flat config format):

```js
import eslintPluginAstro from 'eslint-plugin-astro';

export default [
  ...eslintPluginAstro.configs.recommended,
  {
    ignores: ['.astro/**', 'dist/**'],
  },
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
```

Notes:

- **`.astro/**` is ignored\*\* — that's Astro's auto-generated types directory. Linting it produces dozens of false positives.
- **`argsIgnorePattern: '^_'`** — prefix unused variables with `_` to silence the warning intentionally.

### Usage

```bash
npm run lint
```

## VS Code Integration

To make this all seamless, I added `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[astro]": {
    "editor.defaultFormatter": "astro-build.astro-vscode"
  },
  "eslint.validate": ["javascript", "typescript", "astro"]
}
```

And recommended extensions in `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "astro-build.astro-vscode",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

Now when anyone clones this repo, VS Code will suggest the right extensions and formatting just works on save.

## The Scripts

Here's what my `package.json` scripts look like now:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "eslint ."
  }
}
```

## What's Next

In the next post, I'll cover deployment — setting up CI/CD so that `format:check` and `lint` run automatically on every push, and the site deploys on merge to main.
