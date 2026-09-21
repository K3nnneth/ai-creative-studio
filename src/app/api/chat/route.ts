import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ campaignId: z.string().uuid(), messages: z.array(z.custom<UIMessage>()) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid campaign conversation is required." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const [{ data: campaign, error }, { data: creatives, error: creativesError }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, name, angle, audience, status, brands(name, voice, value_proposition, colors), products(title, description, price_amount, currency)")
      .eq("id", parsed.data.campaignId)
      .single(),
    supabase
      .from("creatives")
      .select("id, headline, cta, status, version, feedback_summary, generation_prompt, generation_metadata")
      .eq("campaign_id", parsed.data.campaignId)
      .order("created_at", { ascending: true })
      .limit(12),
  ]);
  if (error || !campaign) return Response.json({ error: "Campaign not found." }, { status: 404 });
  if (creativesError) return Response.json({ error: "Campaign creatives could not be loaded." }, { status: 500 });

  const product = Array.isArray(campaign.products) ? campaign.products[0] : campaign.products;
  const creativeContext = (creatives ?? []).map((creative, index) => ({
    concept: index + 1,
    headline: creative.headline,
    cta: creative.cta,
    status: creative.status,
    version: creative.version,
    feedback: creative.feedback_summary,
    visualDirection: creative.generation_prompt,
    imageAvailable: Boolean(creative.generation_metadata?.finalUrl ?? creative.generation_metadata?.backgroundUrl),
  }));

  const model = process.env.AI_MODEL?.trim() || "inclusionai/ling-3.0-flash-vl-free";
  const result = streamText({
    model,
    temperature: 0.35,
    system: `You are the creative advisor inside AI Creative Studio. Help a marketer review and improve 9:16 image ads for the selected real product. Be concise, practical, and transparent about what is extracted versus suggested. Never invent product features, prices, discounts, or guarantees. When the user asks about, compares, or evaluates the generated creatives, you must call getCampaignCreatives before answering.

The saved creative records below are the concepts currently displayed in the campaign workspace. Treat a creative with imageAvailable=true as generated. You can compare its headline, CTA, status, feedback, and recorded visual direction. You cannot directly inspect image pixels, so say so briefly when a question depends on a visual detail that is not present in the records. Never claim that no creatives exist when the creative list is non-empty.

Campaign context:
${JSON.stringify(campaign)}

Saved creatives:
${JSON.stringify(creativeContext)}`,
    messages: await convertToModelMessages(parsed.data.messages),
    tools: {
      getCampaignCreatives: {
        description: "Load the campaign's current generated creative concepts before evaluating or comparing them.",
        inputSchema: z.object({}),
        execute: async () => ({ product: product?.title ?? campaign.name, direction: campaign.angle, creatives: creativeContext }),
      },
    },
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
