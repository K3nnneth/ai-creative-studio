# AI Ads Manager — Build Checklist

Last updated: September 19, 2026

## MVP definition

- [x] 1. Define the MVP and acceptance criteria
- [x] 2. Set up required service accounts and credentials
- [x] 3. Create the Next.js project and install the fixed stack
- [x] 4. Establish the visual direction and core interface components
- [x] 5. Design and create the Supabase data model
- [x] 6. Configure Supabase Storage for product and ad assets
- [x] 7. Build store URL onboarding
- [x] 8. Build Shopify-first store research
- [x] 9. Analyze and persist the brand kit
- [x] 10. Build the editable catalog review and product-selection checkpoint
- [x] 11. Implement the streamed agent workflow with Vercel AI SDK
- [x] 12. Generate 9:16 creative imagery with fal.ai
- [x] 13. Render reliable headline and CTA overlays
- [x] 14. Upload completed creatives to Supabase Storage
- [x] 15. Build the creative review studio
- [x] 16. Add copy editing, feedback, and regeneration
- [x] 17. Add variant history and approval
- [x] 18. Build campaign persistence and navigation
- [x] 19. Add empty, loading, error, retry, and success states
- [x] 20. Test Loopy Cases end to end
- [x] 21. Test four additional ecommerce stores
- [x] 22. Create and push the GitHub repository
- [x] 23. Deploy to Vercel and verify production
- [ ] 24. Draw the Excalidraw architecture diagram
- [ ] 25. Write the personal build note
- [ ] 26. Record the two-part Loom walkthrough
- [ ] 27. Run the final submission audit

## Fixed stack and submission requirements

The original take-home brief was supplied by the project owner on September 19, 2026. Budget approximately eight hours over one week; prioritize a polished, working creative loop.

- Next.js App Router, React, and Tailwind.
- Vercel AI SDK **and AI Elements** for streaming, tool calls, and generative UI.
- Supabase Postgres and Storage; Auth is optional for a single demo user.
- fal.ai reference-image generation: preserve the real product, choose a model with strong text rendering, and copy outputs into Supabase Storage.
- Research must use Firecrawl Brand Extractor or Exa, Tavily, or Brave. Selected implementation: Firecrawl, supplemented by public Shopify product data when available.
- Any LLM provider is allowed. Selected access layer: Vercel AI Gateway, as recommended by the brief; model selection remains pending.
- Vercel hosting.

Accept company **or product** URLs. Extract the brand logo as well as colors, voice, value proposition, audience, and real product details. Deterministic text overlays remain a legibility safeguard alongside selecting a suitable fal model.

Deliver a GitHub repository link, a Vercel deployment URL, and results from at least five ecommerce stores with varied photography, brand voice, and catalog sizes. The two-part Loom must cover both these results and the build process, including user overrides and lessons learned.

**User-owned deliverables:** the brief explicitly requires the personal note to be written by the user, not AI, and the architecture diagram to be drawn by the user in Excalidraw. The user also records the Loom. Development assistance should explain the implementation so the user can walk through any part in the 45-minute review.

## Step 2 — Setup progress

Local preparation is complete. See [SERVICE_SETUP.md](SERVICE_SETUP.md) for account setup and verification requirements.

- [x] GitHub account exists (confirmed by project owner).
- [x] Add `.env.example`, an ignored `.env.local`, and `.gitignore`.
- [x] Create and verify the Supabase project and server credentials.
- [x] Create fal.ai, Firecrawl, and Vercel accounts.
- [x] Set up Vercel AI Gateway access.
- [x] Populate required local credentials and validate their formats.
- [x] Verify Supabase with a live schema migration and read-only validation query.
- [x] Verify Firecrawl at its first integration point.
- [x] Verify AI Gateway at its first integration point.
- [x] Verify fal.ai at its first integration point.

Credential setup is complete. Live calls are intentionally verified at the first integration point for each service so any consumed credits validate the real workflow rather than throwaway requests.

## Step 3 — Application foundation

- [x] Scaffold Next.js 16 App Router with React 19, TypeScript, Tailwind CSS 4, and ESLint.
- [x] Install Vercel AI SDK and React bindings.
- [x] Install Supabase, fal.ai, Firecrawl, and Zod clients.
- [x] Initialize shadcn/ui and install the first AI Elements component.
- [x] Remove build-time Google font downloads in favor of a deterministic system font stack.
- [x] Pass ESLint and a production Next.js build.

## Step 4 — Visual direction and core interface

- [x] Choose a clean, premium visual direction with warm neutrals, restrained violet accents, soft depth, and product-first imagery.
- [x] Build the responsive application header and primary navigation.
- [x] Build a focused store URL onboarding form with clear Shopify guidance.
- [x] Establish reusable patterns for agent progress, statuses, product rows, and 9:16 creative previews.
- [x] Show the research → generate → manage product story on the landing experience.
- [x] Add responsive desktop/mobile behavior and accessible labels for primary controls.
- [x] Verify the onboarding interaction, ESLint, TypeScript, and production build.

The Loopy Cases content in this visual prototype is representative UI data. Real product facts and imagery will replace it when store research is connected in steps 7–10.

## Step 5 — Supabase data model

- [x] Create and apply the initial SQL migration.
- [x] Create a seeded single-user demo workspace.
- [x] Persist brands, research attempts, reusable catalog products, assets, campaigns, creatives, feedback, and variant ancestry.
- [x] Add lifecycle constraints, relationships, indexes, timestamps, and row-level security.
- [x] Verify all eight tables and the demo workspace in the live Supabase project.
- [x] Add a server-only Supabase client for subsequent features.

See `docs/DATA_MODEL.md` for the relationship map and product reasoning.

## Step 6 — Supabase Storage

- [x] Create the public-read, server-write `source-assets` bucket for logos and product images.
- [x] Create the public-read, server-write `ad-creatives` bucket for generated backgrounds and final ads.
- [x] Restrict both buckets to JPEG, PNG, WebP, and AVIF images.
- [x] Set 15 MB and 25 MB file limits for source assets and creatives respectively.
- [x] Verify both buckets and their limits in the live Supabase project.

See `docs/STORAGE.md` for path conventions and access decisions.

## Step 7 — Store URL onboarding

- [x] Connect the homepage form to a server-side route.
- [x] Normalize company and product URLs to a canonical store domain.
- [x] Reject malformed, local, private-network, credential-bearing, and unsupported-port URLs.
- [x] Upsert the store as a brand and create a queued research run in Supabase.
- [x] Add loading, success, and recoverable error feedback to the form.
- [x] Verify the Loopy Cases submission and invalid URL behavior through the running app.

The onboarding step saves a durable research request. It does not claim that products or brand signals have been found yet; Shopify and Firecrawl extraction begin in step 8.

## Step 8 — Shopify-first store research

- [x] Retrieve and validate the public Shopify catalog.
- [x] Normalize product names, descriptions, prices, variants, tags, and source images.
- [x] Upsert a reusable catalog and hide products absent from a later refresh.
- [x] Persist remote product-image assets with provenance and dimensions.
- [x] Retrieve homepage content, metadata, logo, colors, and brand signals through Firecrawl.
- [x] Preserve raw evidence and per-step progress on every research run.
- [x] Degrade gracefully when Firecrawl fails while retaining a valid Shopify catalog.
- [x] Show real research results and a catalog preview on the homepage.
- [x] Test the full workflow with Loopy Cases: 50 products plus Firecrawl branding saved successfully.

See `docs/RESEARCH.md` for the research sources, persistence behavior, and failure boundaries.

## Step 9 — Brand-kit analysis

- [x] Analyze saved homepage and catalog evidence through Vercel AI Gateway.
- [x] Produce structured voice, audience, value proposition, evidence, and three to five ad angles.
- [x] Keep extracted visual identity separate from AI interpretation.
- [x] Persist the editable fields and field-level evidence on the brand record.
- [x] Add a retry route that reuses saved evidence without spending another Firecrawl request.
- [x] Use a currently available free Gateway model for routine brand analysis.
- [x] Verify the Loopy Cases analysis live and save it to Supabase.

The app uses `inclusionai/ling-3.0-flash-vl-free` by default and supports an `AI_MODEL` override. The generated profile remains a draft for human review in step 10.

## Step 10 — Human review and product selection

- [x] Load the latest researched brand and full catalog from Supabase without repeating research.
- [x] Let the marketer edit voice, audience, and value proposition.
- [x] Label colors as facts extracted from the storefront.
- [x] Show real product images, prices, and readiness across the saved catalog.
- [x] Require one ready product per campaign and explain how to create another campaign later.
- [x] Offer researched ad angles plus a custom direction field.
- [x] Persist the approved fields, selected product, and direction as a draft campaign.
- [x] Complete the checkpoint with Brown Gingham and “Stop the Drop, Start the Style.”

## Step 11 — Streamed creative agent

- [x] Load the persisted campaign, selected product, brand, audience, and direction.
- [x] Stream model responses through a Next.js route using Vercel AI SDK.
- [x] Render the conversation with the installed AI Elements message components.
- [x] Keep extracted facts separate from suggested creative direction in the agent instructions.
- [x] Prevent the agent from claiming images exist before generation completes.
- [x] Verify a live streamed Loopy response using the free Gateway model.

## Step 12 — fal.ai reference generation

- [x] Copy the selected real product image into durable Supabase Storage before generation.
- [x] Use the stored product image as the required reference for every concept.
- [x] Generate three 720×1280 portrait backgrounds with distinct art directions.
- [x] Preserve prompts, model, request IDs, seeds, and source ancestry.
- [x] Copy all three fal.ai outputs into the `ad-creatives` bucket immediately.
- [x] Create persisted creative records for the three concepts and move the campaign to review.
- [x] Verify the complete Brown Gingham generation once using paid fal.ai credits.

The first outputs confirm that the reference product remains recognizable, but fal.ai sometimes renders unwanted or misspelled typography even when instructed not to. Step 13 therefore treats generated imagery as a background and applies reliable copy separately; backgrounds with distracting generated text must be cleaned, covered, or regenerated.

## Steps 13–15 — Final rendering and review studio

- [x] Composite exact brand name, headline, and CTA copy at 720×1280 with a deterministic Sharp/SVG renderer.
- [x] Preserve generated backgrounds separately from completed ad files.
- [x] Upload completed PNGs as `generated_ad` assets and connect each one through `output_asset_id`.
- [x] Make rendering idempotent so copy changes replace the same logical output instead of creating storage clutter.
- [x] Show selectable finished concepts with review status, copy fields, feedback, and approval controls.
- [x] Verify editing and re-rendering against the persisted Loopy campaign without another fal.ai call.

The initial fal.ai backgrounds contain unwanted model-generated lettering. A single improved-prompt regeneration was attempted after approval, but fal.ai returned `Forbidden` before producing an image. No repeated paid retries were sent. The revised prompt removes ad-layout cues and explicitly bans typography; the existing backgrounds remain available so the product loop can continue.

## Steps 16–17 — Complete

- [x] Persist natural-language feedback on the selected creative.
- [x] Feed saved feedback into a one-image regeneration prompt.
- [x] Implement child variants with parent IDs, increasing version numbers, durable background/final assets, and feedback linkage.
- [x] Implement exclusive creative approval and campaign approval state.
- [x] Verify a feedback-driven fal.ai variant after switching to the working Nano Banana 2 endpoint.
- [x] Complete the human approval checkpoint on a visually acceptable Loopy creative.

## Step 18 — Campaign persistence and navigation

- [x] List every saved campaign in the demo workspace with its product, brand, lifecycle status, creative count, and latest preview.
- [x] Give each campaign a stable URL using its persisted UUID.
- [x] Load the requested campaign rather than implicitly using only the newest record.
- [x] Link campaign creation directly to the new saved campaign.
- [x] Add navigation between onboarding, saved campaigns, review, and the campaign workspace.
- [x] Verify both existing Loopy campaigns and a specific campaign detail through the live app.

## Step 19 — Resilient workflow states

- [x] Show loading, validation, external-service failure, retry, and success feedback during store research.
- [x] Show loading and recoverable errors while loading the brand review and campaign workspace.
- [x] Give saved campaigns a dedicated empty state and retryable load failure.
- [x] Give draft campaigns with no creatives a clear generation action instead of a dead end.
- [x] Explain that generation can take several minutes before the user starts it.
- [x] Preserve the review campaign when fal.ai generation fails rather than discarding existing work.
- [x] Show progress and actionable failure messages for generation, rendering, copy editing, feedback, variants, and approval.
- [x] Verify the empty draft campaign and persisted review campaign through their stable URLs.

## Step 20 — Loopy end-to-end test in progress

- [x] Reopen the persisted Loopy campaign through its stable URL.
- [x] Save concrete human feedback against a selected creative.
- [x] Confirm the fal.ai account has $9.80 remaining and the configured API key is active with API scope.
- [x] Replace the blocked GLM endpoint with `fal-ai/nano-banana-2/edit`, using its native 9:16 reference-image schema.
- [x] Generate and persist a linked feedback-driven Loopy variant as version 2.
- [x] Verify that the variant preserves the real Brown Gingham product, removes generated lettering, and receives the deterministic headline and CTA overlay.
- [x] Inspect and approve the Nano Banana 2 version 2 creative.

The approved creative is `64ded495-7253-4521-9ee7-aae260554417`. Both the creative and campaign have the `approved` lifecycle status, and the final asset remains available from Supabase Storage after refresh.

## Step 21 — Additional store testing

- [x] Loopy Cases — full research-to-approval path, including a feedback-driven child variant.
- [x] Death Wish Coffee — dark brand voice and packaged goods; rerun after removing Loopy-specific prompt language.
- [x] tentree — apparel variants, lifestyle photography, and sustainability messaging.
- [x] Allbirds — footwear, natural visual identity, and an all-day versatility direction.
- [x] OLIPOP — packaged beverage photography, bright identity, and nostalgic flavor positioning.

All five stores produced persisted research and reviewable creative results. Loopy completed the full approval loop. Death Wish, tentree, Allbirds, and OLIPOP confirmed that generation is grounded in each saved brand, product, audience, and campaign direction rather than a store-specific template.

The cross-store run also exercised recovery paths without unnecessary paid calls: invalid URLs return actionable validation, missing campaigns return a clear not-found state, Firecrawl failure can retain a valid Shopify catalog, brand analysis can retry from saved evidence, and generation failures preserve the campaign for retry. The OLIPOP analysis initially returned overly long model fields; the parser now safely trims verbose text, and the retry completed from persisted evidence without another Firecrawl request.

## Steps 22–23 — Repository and production deployment

- [x] Publish the public GitHub repository at `https://github.com/K3nnneth/ai-creative-studio`.
- [x] Connect the `main` branch to Vercel for automatic deployments.
- [x] Save all required credentials as Vercel project environment variables for production and previews.
- [x] Set the Vercel framework preset to Next.js and disable login protection for the public take-home URL.
- [x] Verify the public homepage, saved campaign list, Supabase-backed records, and durable creative images at `https://ai-creative-studio-neon.vercel.app`.

## Step 1 — Agreed MVP

### Product promise

A marketer can enter a Shopify store URL and leave with a reviewable, editable, and approvable 9:16 image ad made from a real product photo.

### Primary user journey

1. The marketer enters a store URL.
2. The agent researches the store and reports progress as it works.
3. The app shows an editable brand kit and real products found on the store.
4. The app saves the discovered products as a reusable catalog.
5. The marketer corrects the research, chooses a catalog item, and confirms an ad direction.
6. The agent generates three portrait ad concepts using that product photo.
7. The marketer reviews a concept and gives natural-language feedback.
8. The agent generates a linked variant that reflects the feedback.
9. The marketer approves a final creative.
10. The marketer can return to the catalog and start another ad set without researching the store again.
11. The campaign, catalog, research, source assets, creatives, feedback, variants, and statuses remain available after refresh.

### Required for the first release

- Shopify-first URL research with a graceful unsupported-store state
- Real product names, descriptions, prices, and image URLs where available
- A persistent, editable product catalog created automatically from store research
- Product-level readiness and source indicators so users know which catalog items have enough information to generate from
- Editable brand colors, voice, audience, value proposition, and ad angle
- Clear labels for extracted facts and AI inferences
- A catalog review and product-selection checkpoint before generation
- Three 9:16 concepts for one selected product
- Headline and CTA rendered legibly inside each finished image
- Durable copies of product and generated images in Supabase Storage
- Natural-language feedback that affects the next generation
- Parent/child variant history
- Draft, generating, review, approved, and failed statuses
- Recoverable research and generation failures
- A polished desktop experience and a usable responsive layout

### Explicitly outside the MVP

- Authentication and multi-user teams
- Billing or usage limits
- Publishing directly to ad networks
- Performance analytics and optimization
- Video ads
- Bulk campaign generation
- A full manual image editor
- Support guarantees for every ecommerce platform
- Production-scale scraping infrastructure

### Acceptance criteria

The MVP is complete when a fresh user can use Loopy Cases to complete the entire primary journey without database edits or manual file handling, refresh the app without losing their work, and open an approved creative from a durable Supabase URL. A failed external request must offer a clear retry or editable fallback rather than strand the user.

### Product decisions

- Optimize research for Shopify because reliable product identity matters more than broad but fragile scraping.
- Ask the user to confirm research and creative direction only after the agent has produced a useful first pass.
- Generate the composition around a reference product image, then render copy deterministically for spelling and legibility.
- Use a single demo workspace instead of authentication so the build time goes toward the evaluated creative loop.
- Treat regeneration as a new linked variant so feedback remains inspectable and reproducible.
- Treat the researched product catalog as a reusable workspace asset rather than a temporary onboarding result.
- Generate for one selected catalog item per run in the MVP. Users can return and select another item; bulk generation remains outside the MVP.
