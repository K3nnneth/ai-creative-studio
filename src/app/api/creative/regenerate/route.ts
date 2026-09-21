import { fal } from "@fal-ai/client";
import { z } from "zod";

import { renderCreative } from "@/lib/creative-renderer";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({ creativeId: z.string().uuid() });

function extension(contentType: string | null) {
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  return "png";
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid creative ID is required." }, { status: 400 });
  if (!process.env.FAL_KEY) return Response.json({ error: "FAL_KEY is not configured." }, { status: 500 });

  const supabase = getSupabaseAdmin();
  const { data: parent, error: parentError } = await supabase.from("creatives")
    .select("id, campaign_id, product_id, version, headline, cta, feedback_summary, source_asset_id, generation_prompt, campaigns(brand_id, angle, brands(name))")
    .eq("id", parsed.data.creativeId).single();
  if (parentError || !parent) return Response.json({ error: "Creative not found." }, { status: 404 });
  if (!parent.feedback_summary?.trim()) return Response.json({ error: "Save feedback before generating a variant." }, { status: 409 });
  const campaign = Array.isArray(parent.campaigns) ? parent.campaigns[0] : parent.campaigns;
  const brand = Array.isArray(campaign?.brands) ? campaign.brands[0] : campaign?.brands;
  if (!campaign || !parent.source_asset_id) return Response.json({ error: "Creative source data is incomplete." }, { status: 409 });

  const { data: sourceAsset } = await supabase.from("assets").select("storage_bucket, storage_path, source_url").eq("id", parent.source_asset_id).single();
  if (!sourceAsset) return Response.json({ error: "The source product image is unavailable." }, { status: 409 });
  const sourceUrl = sourceAsset.storage_bucket && sourceAsset.storage_path
    ? supabase.storage.from(sourceAsset.storage_bucket).getPublicUrl(sourceAsset.storage_path).data.publicUrl
    : sourceAsset.source_url;
  if (!sourceUrl) return Response.json({ error: "The source product image is unavailable." }, { status: 409 });

  const { data: latestChild } = await supabase.from("creatives").select("version").eq("parent_creative_id", parent.id).order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (latestChild?.version ?? parent.version) + 1;
  const prompt = `Create a full-screen 9:16 editorial product photograph from the supplied exact product reference. Preserve the product design, pattern, shape, materials, camera opening, loop, and existing product mark. Show one product only. Apply this user feedback: ${parent.feedback_summary}. The scene must contain no added typography, letters, words, captions, signs, posters, banners, packaging cards, prices, interface elements, or graphic layouts. Realistic commercial photography with no invented accessories. Visual direction: ${campaign.angle ?? "premium product photography"}.`;

  try {
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", parent.campaign_id);
    fal.config({ credentials: process.env.FAL_KEY });
    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", { input: { prompt, image_urls: [sourceUrl], aspect_ratio: "9:16", resolution: "1K", num_images: 1, output_format: "png", limit_generations: true } });
    const data = result.data as { images?: Array<{ url: string; width: number; height: number; content_type?: string }>; seed?: number };
    const image = data.images?.[0];
    if (!image?.url) throw new Error("fal.ai returned no image.");
    const imageResponse = await fetch(image.url, { signal: AbortSignal.timeout(45_000) });
    if (!imageResponse.ok) throw new Error("The generated variant could not be downloaded.");
    const imageType = imageResponse.headers.get("content-type") || image.content_type || "image/png";
    const backgroundPath = `${campaign.brand_id}/${parent.campaign_id}/variant-${parent.id}-v${version}.${extension(imageType)}`;
    const backgroundBuffer = await imageResponse.arrayBuffer();
    const { error: backgroundUploadError } = await supabase.storage.from("ad-creatives").upload(backgroundPath, backgroundBuffer, { contentType: imageType, upsert: true });
    if (backgroundUploadError) throw new Error(backgroundUploadError.message);
    const { data: backgroundAsset, error: backgroundAssetError } = await supabase.from("assets").insert({ brand_id: campaign.brand_id, product_id: parent.product_id, kind: "generated_background", source_url: image.url, storage_bucket: "ad-creatives", storage_path: backgroundPath, mime_type: imageType, width: image.width, height: image.height, status: "stored", metadata: { falRequestId: result.requestId, seed: data.seed, model: "fal-ai/nano-banana-2/edit", parentCreativeId: parent.id } }).select("id").single();
    if (backgroundAssetError || !backgroundAsset) throw new Error(backgroundAssetError?.message ?? "Variant background could not be saved.");

    const finalBuffer = await renderCreative({ background: backgroundBuffer, brandName: brand?.name ?? "AI Creative Studio", headline: parent.headline, cta: parent.cta });
    const outputPath = `${campaign.brand_id}/${parent.campaign_id}/variant-${parent.id}-v${version}-final.png`;
    const { error: outputUploadError } = await supabase.storage.from("ad-creatives").upload(outputPath, finalBuffer, { contentType: "image/png", upsert: true });
    if (outputUploadError) throw new Error(outputUploadError.message);
    const { data: outputAsset, error: outputAssetError } = await supabase.from("assets").insert({ brand_id: campaign.brand_id, product_id: parent.product_id, kind: "generated_ad", storage_bucket: "ad-creatives", storage_path: outputPath, mime_type: "image/png", width: 720, height: 1280, status: "stored", metadata: { renderer: "sharp-svg-v1", backgroundAssetId: backgroundAsset.id } }).select("id").single();
    if (outputAssetError || !outputAsset) throw new Error(outputAssetError?.message ?? "Variant output could not be saved.");
    const finalUrl = supabase.storage.from("ad-creatives").getPublicUrl(outputPath).data.publicUrl;
    const backgroundUrl = supabase.storage.from("ad-creatives").getPublicUrl(backgroundPath).data.publicUrl;
    const { data: variant, error: variantError } = await supabase.from("creatives").insert({ campaign_id: parent.campaign_id, product_id: parent.product_id, parent_creative_id: parent.id, version, status: "review", headline: parent.headline, cta: parent.cta, generation_prompt: prompt, feedback_summary: parent.feedback_summary, source_asset_id: parent.source_asset_id, background_asset_id: backgroundAsset.id, output_asset_id: outputAsset.id, generation_metadata: { falRequestId: result.requestId, seed: data.seed, model: "fal-ai/nano-banana-2/edit", backgroundUrl, finalUrl, renderer: "sharp-svg-v1" } }).select("id, version").single();
    if (variantError || !variant) throw new Error(variantError?.message ?? "Variant record could not be saved.");
    await supabase.from("creative_feedback").update({ resulting_creative_id: variant.id }).eq("creative_id", parent.id).is("resulting_creative_id", null);
    await supabase.from("campaigns").update({ status: "review" }).eq("id", parent.campaign_id);
    return Response.json({ variant });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Variant generation failed.";
    await supabase.from("campaigns").update({ status: "review" }).eq("id", parent.campaign_id);
    return Response.json({ error: message }, { status: 502 });
  }
}
