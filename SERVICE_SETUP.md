# Step 2 — Service accounts and credentials

Status: account setup and local credentials are complete. Supabase, fal.ai, Firecrawl, and Vercel AI Gateway values passed local presence and format validation without exposing them. The client libraries are installed; live calls will be verified at each service's first real integration point to conserve credits. Use Vercel AI Gateway for LLM access, following the brief's recommendation.

## Account setup

| Service | Purpose | Required action |
| --- | --- | --- |
| [Supabase](https://supabase.com/dashboard) | Database and durable asset storage | Create or choose a dedicated AI Ads Manager project. Save its project URL and secret key in `.env.local`. |
| [fal.ai](https://fal.ai/dashboard/keys) | Generate imagery using a product reference photo | Create an API key and confirm the account can run image generation. Save the key as `FAL_KEY`. |
| [Firecrawl](https://www.firecrawl.dev/) | Brand extraction and store research | Create an account and save its API key as `FIRECRAWL_API_KEY`. |
| [Vercel AI Gateway](https://vercel.com/ai-gateway) | Brand analysis, copy, and streamed workflow | In Vercel, open AI Gateway > API Keys, create a key, and save it as `AI_GATEWAY_API_KEY`. Choose an available model during integration. |
| [GitHub](https://github.com) | Source repository in step 22 | Confirm the account that will own the repository. No GitHub token is needed in the app environment. |
| [Vercel](https://vercel.com/dashboard) | Hosting in step 23 | Confirm the account that will own the deployment. No Vercel token is needed in the app environment. |

Use the Supabase project's Connect dialog for its URL and Settings > API Keys for a secret key. Use current `sb_secret_...` keys for server access. The planned demo workspace can route database and storage operations through the application server, so a browser publishable key is not required at this stage. Secret keys bypass row-level security and must remain on the server. See the [Supabase API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys).

The fal client reads `FAL_KEY` from the server environment. Do not put it in browser code. See the [fal API authentication example](https://fal.ai/models/fal-ai/bagel/api); this is an authentication reference, not a selection of the image-generation model.

No Shopify merchant credentials are planned for public-store research. Database tables, storage buckets, and the generation model will be configured in their respective later steps.

## Local credentials

A `.env.local` has been prepared beside `.env.example`. Enter real values only in `.env.local`, not in chat or tracked documents. The model remains unset until integration. Existing local values are preserved when adding newly required variables.

Firecrawl uses `FIRECRAWL_API_KEY` ([documentation](https://docs.firecrawl.dev/quickstarts/sveltekit)). Gateway uses `AI_GATEWAY_API_KEY` for local access ([authentication documentation](https://vercel.com/docs/ai-gateway/authentication-and-byok)).

`.gitignore` excludes environment files except `.env.example`. Keep the Supabase database password in a password manager; the application does not need it for Supabase API access.

When deploying in step 23, add the selected runtime variables to the Vercel project's environment settings. Mark secrets sensitive where supported; see [Vercel sensitive environment variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables). Local `.env.local` values do not automatically configure production.

## Completion checks

- [x] Create a blank environment template and ignored local credentials file.
- [x] Document the required services and credential locations.
- [x] Confirm an existing GitHub account.
- [x] Create or confirm a Vercel account.
- [x] Create or select a Supabase project and populate its URL and secret key.
- [x] Populate `FAL_KEY`; generation access verification remains pending.
- [x] Populate `FIRECRAWL_API_KEY`; brand extraction verification remains pending.
- [x] Populate `AI_GATEWAY_API_KEY`; model selection and live verification remain pending.
- [x] Verify Supabase access with an applied migration and read-only validation query without printing credentials.
- [ ] Verify model access and record any billing or permission blockers without printing credentials.

Do not mark checklist step 2 complete until the required accounts and credentials are confirmed and verified. API reachability alone does not demonstrate that paid generation works; record that distinction if generation verification is deferred.

## Step 3 handoff

The supplied brief fixes Next.js App Router, React, Tailwind, Vercel AI SDK, AI Elements, Supabase, fal.ai, a permitted research API, and Vercel hosting. We selected Firecrawl for research and Vercel AI Gateway for LLM access. See `PROJECT_CHECKLIST.md` for the full requirements and user-owned deliverables.

The current shell did not resolve `node`, `npm`, or `git` on PATH during the initial inspection. Resolve the development toolchain during step 3 before scaffolding the application.
