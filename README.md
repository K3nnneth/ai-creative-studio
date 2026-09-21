# AI Creative Studio

AI Creative Studio turns a Shopify store URL into reviewable 9:16 image ads made from real catalog products. It researches the brand, builds a reusable product catalog, generates product-referenced concepts, and lets a marketer edit, regenerate, and approve the result.

## Product flow

1. Submit a Shopify store or product URL.
2. Import up to 50 products from Shopify and research the public brand page with Firecrawl.
3. Review the inferred brand kit, select a product, and choose a campaign direction.
4. Generate three portrait concepts with fal.ai using the real product image as a reference.
5. Render exact headline and CTA text over each image and copy the finished PNGs into Supabase Storage.
6. Edit copy, give visual feedback, generate linked variants, and approve a creative.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Vercel AI SDK and AI Elements for streaming chat and tool calls
- Vercel AI Gateway for brand analysis and the creative advisor
- Firecrawl for public brand-page research
- fal.ai Nano Banana 2 Edit for reference-image generation
- Supabase Postgres and Storage for brands, products, campaigns, assets, variants, feedback, and final ads

## Local setup

1. Copy `.env.example` to `.env.local` and add the required credentials.
2. Apply the SQL migrations in `supabase/migrations` to the Supabase project.
3. Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The app uses a single shared demo workspace, which is allowed by the take-home brief. Authentication and production background jobs are outside this MVP.

See `docs/` for the data model, research pipeline, and Storage conventions. See `PROJECT_CHECKLIST.md` for build and submission progress.
