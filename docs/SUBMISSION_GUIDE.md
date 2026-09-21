# Submission guide

This file is a factual reference for the project owner's own note, Excalidraw diagram, and Loom. The take-home explicitly requires the note and diagram to be created by the project owner.

## Architecture to draw in Excalidraw

Draw four columns connected left to right:

1. **Next.js UI** — URL onboarding, catalog and brand review, campaign workspace, creative advisor.
2. **Research and reasoning** — Shopify public catalog, Firecrawl homepage research, Vercel AI Gateway brand analysis and advisor tools.
3. **Generation** — source product image, fal.ai Nano Banana 2 Edit, deterministic Sharp/SVG headline and CTA renderer.
4. **Supabase** — Postgres records for brands/products/campaigns/creatives/feedback plus Storage buckets for source assets and final PNGs.

Show the feedback loop from the campaign workspace back to fal.ai. Label the user checkpoints at product/direction selection and final approval. Show that fal.ai's temporary output is copied immediately to Supabase Storage before the final overlay is rendered.

## Facts for the personal note

Use these as prompts and write the note in your own words:

- Why Shopify-first parsing was chosen: a predictable public catalog structure gives more reliable product identity and imagery.
- Why one product is selected per campaign: it keeps review focused while the imported catalog remains reusable.
- Why text is rendered after fal.ai generation: deterministic overlays keep headlines and CTAs exact and legible.
- Why the app uses a single demo workspace: authentication is optional in the brief, so the time went into the evaluated creative loop.
- What you overrode during development: simplified navigation and campaign layout, made the catalog reusable, removed duplicate feedback controls, and required the advisor to understand saved creatives.
- What you learned: model output needs schema limits and fallbacks; temporary generated assets must be copied to durable storage; reference-image prompts still require visual review.

## Loom part 1: results

Walk through these five saved brands: Loopy Cases, Death Wish Coffee, tentree, Allbirds, and OLIPOP. For each, briefly show the imported catalog, brand direction, and three creative results. Spend the most time on Loopy because it demonstrates copy editing, feedback-driven regeneration, variant ancestry, and approval.

## Loom part 2: how it works

Follow one asset through the system:

1. The URL is normalized and saved as a research run.
2. Shopify supplies structured product data; Firecrawl supplies public brand-page evidence.
3. AI Gateway turns saved evidence into an editable brand brief.
4. The user selects a real catalog product and direction.
5. The server copies the source image to Supabase, sends its durable URL to fal.ai, and saves the returned background.
6. Sharp renders exact copy and uploads the completed PNG.
7. Feedback creates a linked variant; approval updates the creative and campaign status.

Demonstrate one recovery path, such as retrying brand analysis from saved evidence, and mention that it avoids spending another Firecrawl request.

## Final checks before submitting

- Repository link opens without special access.
- Vercel URL works in a private window.
- Production environment variables are configured.
- One complete Loopy flow works in production.
- All five store results remain visible.
- Excalidraw share link or PNG is accessible.
- Loom link is accessible without requesting permission.
- Personal note is written in your own voice.
