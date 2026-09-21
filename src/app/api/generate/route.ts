import { fal } from "@fal-ai/client";
import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createCreativeConcepts } from "@/lib/creative-concepts";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({ campaignId: z.string().uuid() });

function extension(contentType: string | null) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid campaign ID is required." }, { status: 400 });
  if (!process.env.FAL_KEY) return Response.json({ error: "FAL_KEY is not configured." }, { status: 500 });

  const supabase = getSupabaseAdmin();
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, brand_id, product_id, angle, audience, brands(name, colors, voice, value_proposition), products(title, description)")
    .eq("id", parsed.data.campaignId)
    .single();
  if (campaignError || !campaign) return Response.json({ error: "Campaign not found." }, { status: 404 });

  const { data: sourceAsset, error: sourceError } = await supabase.from("assets").select("id, source_url, storage_path, mime_type").eq("product_id", campaign.product_id).eq("kind", "product_source").order("created_at").limit(1).single();
  if (sourceError || !sourceAsset?.source_url) return Response.json({ error: "The selected product has no source image." }, { status: 409 });

  try {
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaign.id);

    let durableSourceUrl = sourceAsset.source_url;
    if (!sourceAsset.storage_path) {
      const sourceResponse = await fetch(sourceAsset.source_url, { signal: AbortSignal.timeout(30_000) });
      if (!sourceResponse.ok) throw new Error("The product source image could not be downloaded.");
      const contentType = sourceResponse.headers.get("content-type") || "image/jpeg";
      const sourcePath = `${campaign.brand_id}/${campaign.product_id}/primary.${extension(contentType)}`;
      const { error: uploadError } = await supabase.storage.from("source-assets").upload(sourcePath, await sourceResponse.arrayBuffer(), { contentType, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: publicSource } = supabase.storage.from("source-assets").getPublicUrl(sourcePath);
      durableSourceUrl = publicSource.publicUrl;
      await supabase.from("assets").update({ storage_bucket: "source-assets", storage_path: sourcePath, mime_type: contentType, status: "stored" }).eq("id", sourceAsset.id);
    }

    fal.config({ credentials: process.env.FAL_KEY });
    const brand = Array.isArray(campaign.brands) ? campaign.brands[0] : campaign.brands;
    const product = Array.isArray(campaign.products) ? campaign.products[0] : campaign.products;
    if (!brand || !product) throw new Error("The campaign brand or product is unavailable.");
    const { concepts, model: conceptModel } = await createCreativeConcepts({
      brandName: brand.name ?? "Store",
      productTitle: product.title,
      productDescription: product.description,
      campaignAngle: campaign.angle ?? "Show the product clearly",
      audience: campaign.audience,
      voice: brand.voice,
      valueProposition: brand.value_proposition,
    });
    const generated = await Promise.all(concepts.map(async (concept) => {
      const prompt = `Create a full-screen 9:16 editorial product photograph using the supplied real product photo as the exact reference for ${product.title}. Preserve every visible product detail, shape, color, pattern, material, proportion, logo, and packaging without alteration. Show one product prominently in a natural photographic scene. The entire scene must contain no added typography, captions, signs, posters, packaging cards, banners, prices, interface elements, grids, or graphic-design layouts. Do not add letters or words anywhere. Photography direction: ${concept.treatment}. Campaign direction: ${campaign.angle}. Realistic commercial photography, natural lighting, crisp edges, no duplicate products and no invented accessories or features.`;
      const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
        input: { prompt, image_urls: [durableSourceUrl], aspect_ratio: "9:16", resolution: "1K", num_images: 1, output_format: "png", limit_generations: true },
      });
      const data = result.data as { images?: Array<{ url: string; width: number; height: number; content_type?: string }>; seed?: number };
      const image = data.images?.[0];
      if (!image?.url) throw new Error("fal.ai returned no image.");
      return { concept, image, prompt, seed: data.seed, requestId: result.requestId };
    }));

    const creatives = [];
    for (const [index, item] of generated.entries()) {
      const outputResponse = await fetch(item.image.url, { signal: AbortSignal.timeout(45_000) });
      if (!outputResponse.ok) throw new Error("A generated image could not be downloaded from fal.ai.");
      const contentType = outputResponse.headers.get("content-type") || item.image.content_type || "image/png";
      const outputPath = `${campaign.brand_id}/${campaign.id}/background-${index + 1}.${extension(contentType)}`;
      const { error: uploadError } = await supabase.storage.from("ad-creatives").upload(outputPath, await outputResponse.arrayBuffer(), { contentType, upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      const { data: publicOutput } = supabase.storage.from("ad-creatives").getPublicUrl(outputPath);
      const { data: asset, error: assetError } = await supabase.from("assets").insert({ brand_id: campaign.brand_id, product_id: campaign.product_id, kind: "generated_background", source_url: item.image.url, storage_bucket: "ad-creatives", storage_path: outputPath, mime_type: contentType, width: item.image.width, height: item.image.height, status: "stored", metadata: { falRequestId: item.requestId, seed: item.seed, model: "fal-ai/nano-banana-2/edit" } }).select("id").single();
      if (assetError || !asset) throw new Error(assetError?.message ?? "Generated asset could not be saved.");
      const { data: creative, error: creativeError } = await supabase.from("creatives").insert({ campaign_id: campaign.id, product_id: campaign.product_id, version: 1, status: "draft", headline: item.concept.headline, cta: item.concept.cta, generation_prompt: item.prompt, source_asset_id: sourceAsset.id, background_asset_id: asset.id, generation_metadata: { falRequestId: item.requestId, seed: item.seed, backgroundUrl: publicOutput.publicUrl, concept: index + 1, conceptModel } }).select("id, headline, cta, status, generation_metadata").single();
      if (creativeError || !creative) throw new Error(creativeError?.message ?? "Creative could not be saved.");
      creatives.push(creative);
    }

    await supabase.from("campaigns").update({ status: "review" }).eq("id", campaign.id);
    return Response.json({ creatives });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign.id);
    console.error("Creative generation failed " + JSON.stringify({ message }));
    return Response.json({ error: message }, { status: 502 });
  }
}
