# Store research

The onboarding route validates the submitted URL, creates a `research_runs` record, and executes two independent sources in parallel.

## Shopify catalog

The app requests the store's public `/products.json?limit=50` endpoint and validates the response before using it. It saves product identity, handle, source URL, cleaned description, vendor, type, prices, variants, tags, readiness issues, and up to eight source images per product. Product rows are upserted by Shopify product ID so rerunning research refreshes the catalog instead of duplicating it. Products missing from the latest result are hidden rather than deleted, preserving references from future campaigns.

Images are recorded as remote `product_source` assets with their original URLs and dimensions. Copying those files into Supabase Storage happens later in the generation workflow.

## Firecrawl brand page

Firecrawl scrapes the homepage for markdown, metadata, and its branding profile. The app stores the raw research evidence on the research run and promotes directly extracted fields—name, logo, colors, and Firecrawl's voice/audience signals—to the brand record. Broader interpretation of voice, audience, value proposition, and ad angles belongs to the brand-analysis step.

## AI brand analysis

Vercel AI Gateway receives a bounded excerpt of the saved homepage plus a sample of saved products. It returns concise voice, audience, value proposition, supporting evidence, and three to five suggested ad angles. The output is validated before it is written to the brand record. A dedicated retry route reads the evidence already stored in Supabase, so an analysis retry does not repeat Shopify or Firecrawl requests.

The default model is `inclusionai/ling-3.0-flash-vl-free`; `AI_MODEL` can override it. Extracted logo and colors remain distinct from AI-interpreted messaging fields so the review UI can explain which details came directly from the store.

If Firecrawl fails while Shopify succeeds, the product catalog is still saved and the run reports a warning. If the Shopify catalog is unavailable or invalid, the run fails with an editable, retryable error because the MVP does not generate ads without verified products.

## Data lifecycle

Each attempt progresses through URL validation, Shopify retrieval, Firecrawl retrieval, and catalog persistence. The complete attempt, including partial provider failures, remains in `research_runs`. The latest successful product facts live in `products`; source image provenance lives in `assets`.
