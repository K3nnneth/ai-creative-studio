import { z } from "zod";

import { analyzeBrand } from "@/lib/research/brand-analysis";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ brandId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "A valid brand ID is required." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const [{ data: brand, error: brandError }, { data: products, error: productsError }, { data: run, error: runError }] = await Promise.all([
    supabase.from("brands").select("id, name, canonical_domain, evidence").eq("id", parsed.data.brandId).single(),
    supabase.from("products").select("title, description, product_type, price_amount").eq("brand_id", parsed.data.brandId).neq("status", "hidden").order("position").limit(15),
    supabase.from("research_runs").select("raw_result").eq("brand_id", parsed.data.brandId).eq("status", "completed").order("created_at", { ascending: false }).limit(1).single(),
  ]);

  if (brandError || !brand) return Response.json({ error: "Brand not found." }, { status: 404 });
  if (productsError || !products) return Response.json({ error: "Saved products could not be loaded." }, { status: 500 });
  if (runError || !run) return Response.json({ error: "Saved research evidence could not be loaded." }, { status: 500 });

  const rawResult = run.raw_result as { firecrawl?: { markdown?: string } } | null;
  const homepageMarkdown = rawResult?.firecrawl?.markdown;
  if (!homepageMarkdown) return Response.json({ error: "The latest research run has no saved homepage evidence." }, { status: 409 });

  try {
    const result = await analyzeBrand({
      brandName: brand.name ?? brand.canonical_domain,
      domain: brand.canonical_domain,
      homepageMarkdown,
      products: products.map((product) => ({
        title: product.title,
        description: product.description,
        productType: product.product_type,
        priceAmount: product.price_amount,
      })),
    });

    const existingEvidence = brand.evidence && typeof brand.evidence === "object" ? brand.evidence : {};
    const { error: updateError } = await supabase.from("brands").update({
      voice: result.analysis.voice,
      audience: result.analysis.audience,
      value_proposition: result.analysis.valueProposition,
      research_status: "ready",
      evidence: {
        ...existingEvidence,
        analysis: { model: result.model, adAngles: result.analysis.adAngles, fieldEvidence: result.analysis.evidence },
        analysisError: null,
      },
    }).eq("id", brand.id);
    if (updateError) throw new Error(updateError.message);

    return Response.json({ analysis: result.analysis, model: result.model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brand analysis failed.";
    console.error("Saved brand analysis failed " + JSON.stringify({ message }));
    return Response.json({ error: message }, { status: 502 });
  }
}
