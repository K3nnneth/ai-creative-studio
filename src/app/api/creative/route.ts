import { z } from "zod";

import { renderCreative } from "@/lib/creative-renderer";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("edit"), creativeId: z.string().uuid(), headline: z.string().trim().min(1).max(90), cta: z.string().trim().min(1).max(36) }),
  z.object({ action: z.literal("feedback"), creativeId: z.string().uuid(), feedback: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("approve"), creativeId: z.string().uuid() }),
]);

export async function PATCH(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "The creative update is incomplete." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: creative, error } = await supabase
    .from("creatives")
    .select("id, campaign_id, background_asset_id, output_asset_id, headline, cta, generation_metadata, campaigns(brand_id, product_id, brands(name))")
    .eq("id", parsed.data.creativeId)
    .single();
  if (error || !creative) return Response.json({ error: "Creative not found." }, { status: 404 });

  if (parsed.data.action === "feedback") {
    const { error: feedbackError } = await supabase.from("creative_feedback").insert({ creative_id: creative.id, feedback: parsed.data.feedback });
    if (feedbackError) return Response.json({ error: "Feedback could not be saved." }, { status: 500 });
    await supabase.from("creatives").update({ feedback_summary: parsed.data.feedback }).eq("id", creative.id);
    return Response.json({ message: "Feedback saved for the next variant." });
  }

  if (parsed.data.action === "approve") {
    const approvedAt = new Date().toISOString();
    await supabase.from("creatives").update({ status: "review", approved_at: null }).eq("campaign_id", creative.campaign_id).eq("status", "approved");
    const { error: approveError } = await supabase.from("creatives").update({ status: "approved", approved_at: approvedAt }).eq("id", creative.id);
    if (approveError) return Response.json({ error: "Creative could not be approved." }, { status: 500 });
    await supabase.from("campaigns").update({ status: "approved" }).eq("id", creative.campaign_id);
    return Response.json({ status: "approved", approvedAt });
  }

  const campaign = Array.isArray(creative.campaigns) ? creative.campaigns[0] : creative.campaigns;
  const brand = Array.isArray(campaign?.brands) ? campaign.brands[0] : campaign?.brands;
  if (!campaign || !creative.background_asset_id) return Response.json({ error: "Creative source data is incomplete." }, { status: 409 });
  const { data: background, error: backgroundError } = await supabase.from("assets").select("storage_bucket, storage_path").eq("id", creative.background_asset_id).single();
  if (backgroundError || !background?.storage_bucket || !background.storage_path) return Response.json({ error: "Creative background is unavailable." }, { status: 409 });
  const { data: downloaded, error: downloadError } = await supabase.storage.from(background.storage_bucket).download(background.storage_path);
  if (downloadError || !downloaded) return Response.json({ error: "Creative background could not be loaded." }, { status: 502 });

  const output = await renderCreative({ background: await downloaded.arrayBuffer(), brandName: brand?.name ?? "AI Creative Studio", headline: parsed.data.headline, cta: parsed.data.cta });
  const outputPath = `${campaign.brand_id}/${creative.campaign_id}/creative-${creative.id}.png`;
  const { error: uploadError } = await supabase.storage.from("ad-creatives").upload(outputPath, output, { contentType: "image/png", upsert: true });
  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });
  const { data: publicOutput } = supabase.storage.from("ad-creatives").getPublicUrl(outputPath);

  let outputAssetId = creative.output_asset_id;
  if (outputAssetId) {
    const { error: assetError } = await supabase.from("assets").update({ storage_path: outputPath, status: "stored", metadata: { renderer: "sharp-svg-v1", backgroundAssetId: creative.background_asset_id } }).eq("id", outputAssetId);
    if (assetError) return Response.json({ error: assetError.message }, { status: 500 });
  } else {
    const { data: asset, error: assetError } = await supabase.from("assets").insert({ brand_id: campaign.brand_id, product_id: campaign.product_id, kind: "generated_ad", storage_bucket: "ad-creatives", storage_path: outputPath, mime_type: "image/png", width: 720, height: 1280, status: "stored", metadata: { renderer: "sharp-svg-v1", backgroundAssetId: creative.background_asset_id } }).select("id").single();
    if (assetError || !asset) return Response.json({ error: assetError?.message ?? "Final creative asset could not be saved." }, { status: 500 });
    outputAssetId = asset.id;
  }

  const generationMetadata = { ...(creative.generation_metadata ?? {}), finalUrl: `${publicOutput.publicUrl}?v=${Date.now()}`, renderer: "sharp-svg-v1" };
  const { error: updateError } = await supabase.from("creatives").update({ headline: parsed.data.headline, cta: parsed.data.cta, output_asset_id: outputAssetId, status: "review", generation_metadata: generationMetadata }).eq("id", creative.id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });
  await supabase.from("campaigns").update({ status: "review" }).eq("id", creative.campaign_id);
  return Response.json({ creative: { ...creative, headline: parsed.data.headline, cta: parsed.data.cta, status: "review", generation_metadata: generationMetadata } });
}
