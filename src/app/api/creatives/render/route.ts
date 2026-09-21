import { z } from "zod";

import { renderCreative } from "@/lib/creative-renderer";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ campaignId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid campaign ID is required." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, brand_id, product_id, brands(name)")
    .eq("id", parsed.data.campaignId)
    .single();
  if (campaignError || !campaign) return Response.json({ error: "Campaign not found." }, { status: 404 });
  const brand = Array.isArray(campaign.brands) ? campaign.brands[0] : campaign.brands;

  const { data: creatives, error: creativesError } = await supabase
    .from("creatives")
    .select("id, headline, cta, background_asset_id, output_asset_id, generation_metadata")
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .limit(3);
  if (creativesError || !creatives?.length) return Response.json({ error: "No generated backgrounds were found." }, { status: 409 });

  try {
    const rendered = [];
    for (const [index, creative] of creatives.reverse().entries()) {
      const { data: background, error: backgroundError } = await supabase
        .from("assets")
        .select("storage_bucket, storage_path")
        .eq("id", creative.background_asset_id)
        .single();
      if (backgroundError || !background?.storage_bucket || !background.storage_path) throw new Error("A creative background is unavailable.");

      const { data: downloaded, error: downloadError } = await supabase.storage
        .from(background.storage_bucket)
        .download(background.storage_path);
      if (downloadError || !downloaded) throw new Error(downloadError?.message ?? "A creative background could not be downloaded.");

      const output = await renderCreative({
        background: await downloaded.arrayBuffer(),
        brandName: brand?.name ?? "AI Creative Studio",
        headline: creative.headline,
        cta: creative.cta,
      });
      const outputPath = `${campaign.brand_id}/${campaign.id}/creative-${index + 1}.png`;
      const { error: uploadError } = await supabase.storage
        .from("ad-creatives")
        .upload(outputPath, output, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: publicOutput } = supabase.storage.from("ad-creatives").getPublicUrl(outputPath);

      let outputAssetId = creative.output_asset_id;
      if (outputAssetId) {
        const { error: assetError } = await supabase.from("assets").update({
          storage_bucket: "ad-creatives", storage_path: outputPath, mime_type: "image/png", width: 720, height: 1280,
          status: "stored", metadata: { renderer: "sharp-svg-v1", backgroundAssetId: creative.background_asset_id },
        }).eq("id", outputAssetId);
        if (assetError) throw new Error(assetError.message);
      } else {
        const { data: outputAsset, error: assetError } = await supabase.from("assets").insert({
          brand_id: campaign.brand_id, product_id: campaign.product_id, kind: "generated_ad",
          storage_bucket: "ad-creatives", storage_path: outputPath, mime_type: "image/png", width: 720, height: 1280,
          status: "stored", metadata: { renderer: "sharp-svg-v1", backgroundAssetId: creative.background_asset_id },
        }).select("id").single();
        if (assetError || !outputAsset) throw new Error(assetError?.message ?? "The final creative asset could not be saved.");
        outputAssetId = outputAsset.id;
      }

      const generationMetadata = { ...(creative.generation_metadata ?? {}), finalUrl: publicOutput.publicUrl, renderer: "sharp-svg-v1" };
      const { error: creativeError } = await supabase.from("creatives").update({
        output_asset_id: outputAssetId, status: "review", generation_metadata: generationMetadata,
      }).eq("id", creative.id);
      if (creativeError) throw new Error(creativeError.message);
      rendered.push({ id: creative.id, headline: creative.headline, cta: creative.cta, status: "review", generation_metadata: generationMetadata });
    }

    await supabase.from("campaigns").update({ status: "review" }).eq("id", campaign.id);
    return Response.json({ creatives: rendered });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creative rendering failed.";
    console.error("Creative rendering failed " + JSON.stringify({ message }));
    return Response.json({ error: message }, { status: 500 });
  }
}
