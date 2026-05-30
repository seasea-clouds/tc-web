# SinoTrade Compliance Website

https://sinotradecompliance.com — Multi-language (48 locales) Next.js SSG site for China import compliance services.

## Tech Stack

- Next.js 16 (static export) + next-intl + TypeScript + Tailwind CSS
- Cloudflare Pages deployment
- Blog: MDX content with 48-language i18n

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Structure

- `src/` — Next.js app router pages and components
- `messages/` — 48 locale translation JSON files
- `content/blog/` — Blog MDX files (7 articles × 48 languages)
- `scripts/` — Build and maintenance scripts
- `public/` — Static assets (images, sitemap, llms files)

## Maintenance

See [SOP.md](SOP.md) for translation, blog publishing, and deployment workflows.
