# makers-inc-website

Website for [www.makersinc.nl](https://www.makersinc.nl) — a Dutch sewing/crafting blog and shop.

The setup is a **build-time server-side renderer** using the Astro framework. This means that at deploy time:

1. Astro fetches all content from the Contentful CMS via its REST API
2. It renders every page to static HTML
3. The output goes to Netlify as plain files

There is one exception: the donation form posts to a Netlify serverless function (`netlify/functions/create-donation.mjs`) that writes to Contentful via the Content Management API. Everything else is static.

## Running locally

```bash
# Copy env vars first (see .env section below)
npm run dev           # dev server at localhost:4321
npm run dev:netlify   # dev server via Netlify CLI at localhost:8888, needed to test the donation form
npx astro check       # TypeScript type-check 
npm run build         # full production build
```

## Environment variables

Create a `.env` file in the project root:

```
CONTENTFUL_SPACE_ID=           # Contentful space ID
CONTENTFUL_ACCESS_TOKEN=       # Contentful Delivery API token
STRIPE_PRODUCT_URL=            # Stripe payment link for production for the PDF pattern
STRIPE_PRODUCT_TEST_URL=       # Stripe payment link used during local dev for the PDF pattern
STRIPE_DONATION_URL=           # Stripe payment link for production for the donation button
STRIPE_DONATION_TEST_URL=      # Stripe payment link used during local dev for the donation button
CONTENTFUL_POST_ACCESS_TOKEN=  # Contentful Management API token (write-access, used by the donation function)
```

The Contentful tokens come from Contentful → Settings → API keys/CMA tokens. The Stripe URLs are payment links from the Stripe dashboard. 

## Project structure

```
src/
  pages/                # One file = one URL. Astro's routing is filesystem-based
  layouts/              # Page shells. Layout.astro wraps every page; BlogLayout.astro wraps posts.
  components/           # Reusable UI pieces used by pages and layouts.
  lib/
    contentful.ts       # All Contentful queries live here; the "data access layer".
    contentful-image.ts # Transforms raw Contentful image URLs to CDN-optimised URLs.
    markdown.ts         # Renders Markdown (e.g. the blog posts) from Contentful to HTML. Has custom preprocessing.
  styles/
    global.css          # Global styles and CSS variables (colors, fonts).
netlify/
  functions/
    create-donation.mjs  # The only serverless function. Handles donation form submissions.
public/                  # Static assets (favicon etc.). Copied verbatim to dist/.
```

## Pages / routes

| URL                      | File                                                                   |
|--------------------------|------------------------------------------------------------------------|
| `/`                      | `src/pages/index.astro`                                                |
| `/beginners/`            | `src/pages/beginners/index.astro` — filtered blog posts                |
| `/tips-tricks/`          | `src/pages/tips-tricks/index.astro` — filtered blog posts              |
| `/blog/[slug]/`          | `src/pages/blog/[slug].astro` — individual post                        |
| `/shop/`                 | `src/pages/shop/index.astro` — patterns storefront                     |
| `/product/[slug]/`       | `src/pages/product/[slug].astro` — individual product                  |
| `/download/[slug]/`      | `src/pages/download/[slug].astro` — individual download                |
| `/donate/`               | `src/pages/donate/index.astro` — donation page                         |
| `/donation-success/`     | `src/pages/donation-success/index.astro` — landing page after donation |
| `/order-success/`        | `src/pages/order-success/index.astro` — landing page after ordering    |
| `/over/`                 | `src/pages/over/index.astro` — about page                              |
| `/contact/`              | `src/pages/contact/index.astro` — contact page                         |
| `/privacyverklaring/`    | `src/pages/privacyverklaring/index.astro`                              |
| `/algemene-voorwaarden/` | `src/pages/algemene-voorwaarden/index.astro`                           |

## How Astro pages work

An `.astro` file has two sections separated by `---`:

```astro
---
// This runs at BUILD TIME on the server (Node.js). 
// You can use await here, import modules, access env vars, etc.
const data = await someContentfulQuery();
---

<!-- This is the HTML template. Variables from above are available. -->
<h1>{data.title}</h1>
```

For dynamic routes like `/blog/[slug]/`, you need a `getStaticPaths()` function that returns every slug that should be pre-rendered. Astro calls it once at build time to discover all pages, equivalent to generating a list of routes upfront.

## Contentful content types

All Contentful queries go through typed functions in `src/lib/contentful.ts`. The content types are:

| Content type       | Used for                                                                                                                                            |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `blogPost`         | Blog articles                                                                                                                                       |
| `blogCategory`     | Categories (e.g. "Voor beginners", "Tips & Tricks")                                                                                                 |
| `blogType`         | Post type tags                                                                                                                                      |
| `person`           | Author profile                                                                                                                                      |
| `siteInfo`         | Site-wide content: hero text, logo, etc.                                                                                                            |
| `product`          | Shop items                                                                                                                                          |
| `legalInformation` | Privacy policy and terms pages                                                                                                                      |
| `donationReaction` | Donation messages (written by the serverless function)                                                                                              |
| `download`         | Downloadable files                                                                                                                                  |
| `affiliateLink`    | **Not yet created in Contentful** — interface exists in code but the content type needs to be created in the Contentful UI before it can be queried |

All queries use the `nl-NL` locale.

## Markdown rendering

Blog post bodies and product descriptions are Markdown strings stored in Contentful. `src/lib/markdown.ts` renders them with `marked` and applies custom transformations:

1. **YouTube embeds**: `` `youtube:https://www.youtube.com/...` `` (backtick-wrapped) gets converted to a responsive `youtube-nocookie.com` iframe.
2. **Affiliate links**: Links containing `partner.bol.com` automatically get `rel="nofollow sponsored" target="_blank"`.
3. **Trailing slashes**: Internal links get a `/` appended if missing (required by Astro's `trailingSlash: 'always'` config).
4. **Contentful images**: Image dimensions are pre-fetched from the Contentful API and injected as `width`/`height` attributes to prevent layout shift.

## Blog category filtering

`/beginners/` and `/tips-tricks/` are not separate content types, they're just filtered views of `blogPost`. The filtering happens client-side after fetching all posts, matching on the `blogCategory` field's `category` string. See `getBlogPostsByCategory()` in `contentful.ts`.

## Shop / payments

The URL resolution logic in `src/pages/product/[slug].astro`:
- In development (`import.meta.env.DEV`): uses `STRIPE_PRODUCT_TEST_URL`
- In production: uses `STRIPE_PRODUCT_URL`
- Falls back to the `stripePaymentLink` field on the Contentful product entry if env vars aren't set

**Important:** Product slugs for `getStaticPaths()` are **hardcoded** in `src/pages/product/[slug].astro`. When you add a new product in Contentful, you also need to add its slug to that array manually:

```typescript
// src/pages/product/[slug].astro
export async function getStaticPaths() {
  const slugs = ['naaipatroon-maxi-wikkelrok', 'your-new-slug-here'];
  return slugs.map((slug) => ({ params: { slug } }));
}
```

## Donation flow

1. User fills out the form on `/donate/`
2. Form posts to `/.netlify/functions/create-donation` (POST, JSON body)
3. The function creates a `donationReaction` entry in Contentful with `donated: false`
4. User is redirected to `/donation-success/`

The function needs `CONTENTFUL_POST_ACCESS_TOKEN` (a Management API token with write access). To test this locally you need `npm run dev:netlify` (not plain `npm run dev`), which runs the Netlify CLI that loads the functions.

## Fonts

Fonts are self-hosted via `@fontsource` packages so there are no Google Fonts requests at runtime. Three fonts are in use: Fraunces (headings), Nunito (body), and Unica One (logo). They're imported in `src/styles/global.css`.

## Deployment

Deployed to Netlify automatically on push to `main`. The build command is `npm run build`, output directory is `dist/`. Config is in `netlify.toml`.

A few legacy URL redirects are also configured in `netlify.toml` (old `/products/*` and `/collections/*` paths redirect to `/shop/`).

## SEO

`src/components/SEO.astro` handles `<title>`, meta description, Open Graph tags, and JSON-LD structured data. Pass `description`, `ogImage`, `ogType`, `datePublished`, and `dateModified` props to `Layout.astro` to populate them. The sitemap is generated automatically by `@astrojs/sitemap` at build time.