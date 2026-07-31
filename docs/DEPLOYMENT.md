# Deployment

The site is fully static — every route, including the social cards, is
prerendered by `next build`. Any host that can serve a Next.js build will do,
and most of them will do it for free.

## Environment variables

| Variable                               | Required | Purpose                                                |
| -------------------------------------- | -------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`                 | Yes      | Canonical origin. No trailing slash.                   |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No       | Search Console meta-tag verification                   |

`NEXT_PUBLIC_SITE_URL` is read at **build time** by canonical URLs, the sitemap,
`robots.txt`, JSON-LD `@id`s and OG image URLs. Changing it requires a rebuild,
not just a restart.

It falls back to `http://localhost:3000` so a clean checkout builds with no
setup — which also means **forgetting to set it in production ships localhost
URLs in your sitemap**. Check `/robots.txt` after the first deploy.

Locally, copy the example:

```bash
cp .env.example .env.local
```

## Vercel

```bash
npx vercel
```

Framework detection, build command and output directory are all automatic. Add
`NEXT_PUBLIC_SITE_URL` under **Settings → Environment Variables** for Production
(and Preview, if you want preview canonicals to be correct), then redeploy.

## Netlify, Cloudflare Pages, Render

| Setting        | Value           |
| -------------- | --------------- |
| Build command  | `npm run build` |
| Output         | `.next`         |
| Node version   | 20.9 or later   |

Netlify needs `@netlify/plugin-nextjs`; Cloudflare Pages needs the Next.js
preset. Both are offered automatically when the framework is detected.

## Self-hosting

```bash
npm ci
npm run build
npm start          # binds :3000
```

Put a reverse proxy in front for TLS. For containers, `output: "standalone"` in
`next.config.ts` produces a much smaller image — add it if you go that route.

## Static export

Because nothing uses request-time APIs, a plain static export works:

```ts
// next.config.ts
const nextConfig: NextConfig = {
  output: "export",
  pageExtensions: ["ts", "tsx"],
};
```

`npm run build` then emits `out/`, deployable to GitHub Pages, S3 or any static
host. Verify the generated OG images and `apple-icon` survive the export before
relying on it — image routes are the usual casualty.

## Post-deploy verification

```bash
SITE=https://your-domain

curl -s $SITE/robots.txt                    # correct host, sitemap URL
curl -s $SITE/sitemap.xml | head -20        # absolute production URLs
curl -sI $SITE/opengraph-image | head -5    # 200, image/png
curl -s $SITE/ | grep -o '<link rel="canonical"[^>]*>'
```

Then work through the launch checklist in [SEO.md](./SEO.md#launch-checklist).

## Node version

Next.js 16 requires **Node.js 20.9+**; Node 18 is no longer supported. Pin it so
CI and production agree:

```json
// package.json
"engines": { "node": ">=20.9.0" }
```

## Build performance

Build time scales with lesson count, since every page and every OG image is
prerendered. At a few hundred lessons, if OG generation dominates:

- drop `generateStaticParams` from the `opengraph-image.tsx` files so cards
  render on demand and cache, or
- replace the generated cards with a small number of static PNGs

Neither is worth doing before you measure it.
