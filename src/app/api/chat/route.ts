import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { freeGatewayOptions, getAiModel } from "@/lib/ai/model";
import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  page: z.enum(["onboarding", "review", "campaign", "campaigns"]).default("onboarding"),
  brandId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  messages: z.array(z.custom<UIMessage>()),
});

type CreativeContext = { concept: number; headline: string; cta: string; status: string; version: number | null; feedback: string | null; visualDirection: string | null; imageAvailable: boolean };

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid advisor conversation is required." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { page, brandId, campaignId } = parsed.data;
  let pageContext: Record<string, unknown> = { stage: page };
  let creativeContext: CreativeContext[] = [];

  if (page === "campaign" && campaignId) {
    const [{ data: campaign, error }, { data: creatives, error: creativesError }] = await Promise.all([
      supabase.from("campaigns").select("id, name, angle, audience, status, brands(name, voice, audience, value_proposition, colors), products(title, description, price_amount, currency)").eq("id", campaignId).eq("workspace_id", DEMO_WORKSPACE_ID).single(),
      supabase.from("creatives").select("headline, cta, status, version, feedback_summary, generation_prompt, generation_metadata").eq("campaign_id", campaignId).order("created_at", { ascending: true }).limit(12),
    ]);
    if (error || !campaign) return Response.json({ error: "Campaign not found." }, { status: 404 });
    if (creativesError) return Response.json({ error: "Campaign creatives could not be loaded." }, { status: 500 });
    creativeContext = (creatives ?? []).map((creative, index) => ({ concept: index + 1, headline: creative.headline, cta: creative.cta, status: creative.status, version: creative.version, feedback: creative.feedback_summary, visualDirection: creative.generation_prompt, imageAvailable: Boolean(creative.generation_metadata?.finalUrl ?? creative.generation_metadata?.backgroundUrl) }));
    pageContext = { stage: page, campaign, creatives: creativeContext };
  } else if (page === "review" || (page === "onboarding" && brandId)) {
    let brandQuery = supabase.from("brands").select("id, name, canonical_domain, colors, voice, audience, value_proposition, evidence, research_status").eq("workspace_id", DEMO_WORKSPACE_ID);
    brandQuery = brandId ? brandQuery.eq("id", brandId) : brandQuery.order("updated_at", { ascending: false }).limit(1);
    const { data: brands, error } = await brandQuery;
    const brand = brands?.[0];
    if (error) return Response.json({ error: "Brand research could not be loaded." }, { status: 500 });
    if (brand) {
      const { data: products } = await supabase.from("products").select("title, description, product_type, price_amount, currency, status").eq("brand_id", brand.id).neq("status", "hidden").order("position").limit(12);
      pageContext = { stage: page, brand, catalogSample: products ?? [] };
    } else pageContext = { stage: page, note: "No researched brand is available yet." };
  } else if (page === "campaigns") {
    const { data: campaigns, error } = await supabase.from("campaigns").select("id, name, status, angle, updated_at, brands(name), products(title)").eq("workspace_id", DEMO_WORKSPACE_ID).order("updated_at", { ascending: false }).limit(12);
    if (error) return Response.json({ error: "Campaigns could not be loaded." }, { status: 500 });
    pageContext = { stage: page, campaigns: campaigns ?? [] };
  }

  const stageGuidance = {
    onboarding: "Explain the workflow and help the user prepare a useful store submission. Do not claim a store has been researched when context says none is available.",
    review: "Help the marketer audit the brand interpretation. Clearly distinguish facts or extracted evidence from inference. When suggesting revised voice, audience, value proposition, or angles, give concise copy the user can paste into the form. Do not say you changed the form.",
    campaign: "Help refine campaign strategy and saved creatives. When asked to evaluate or compare generated creatives, call getCampaignCreatives first. You cannot inspect image pixels, so do not claim that you can see visual details absent from the records.",
    campaigns: "Help the marketer understand campaign status and decide what work to revisit next.",
  };

  const result = streamText({
    model: getAiModel(), providerOptions: freeGatewayOptions, temperature: 0.3,
    system: `You are the context-aware Studio advisor inside AI Creative Studio. You follow the marketer throughout research, review, generation, and approval. Be concise, practical, and transparent. Never invent product features, prices, discounts, guarantees, research evidence, or actions you did not perform. Advice does not automatically alter saved data; tell the user to apply a suggestion in the visible controls when appropriate.

Current-stage guidance:
${stageGuidance[page]}

Current saved context:
${JSON.stringify(pageContext)}`,
    messages: await convertToModelMessages(parsed.data.messages),
    tools: { getCampaignCreatives: { description: "Load the current campaign's saved creative records before evaluating or comparing them.", inputSchema: z.object({}), execute: async () => ({ creatives: creativeContext }) } },
    stopWhen: stepCountIs(3),
  });
  return result.toUIMessageStreamResponse();
}
