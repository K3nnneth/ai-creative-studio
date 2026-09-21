import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const requestedBrandId = new URL(request.url).searchParams.get("brandId");
  const { data: brands, error: brandError } = await supabase
    .from("brands")
    .select("id, name, canonical_domain, logo_source_url, colors, voice, audience, value_proposition, evidence, research_status")
    .eq("workspace_id", DEMO_WORKSPACE_ID)
    .neq("research_status", "failed")
    .order("updated_at", { ascending: false });

  if (brandError) return Response.json({ error: "The saved workspace could not be loaded." }, { status: 500 });
  const brand = (requestedBrandId ? brands?.find((item) => item.id === requestedBrandId) : undefined) ?? brands?.[0];
  if (!brand) return Response.json({ brand: null, brands: [], products: [] });

  const [{ data: products, error: productsError }, { data: assets, error: assetsError }] = await Promise.all([
    supabase.from("products").select("id, title, description, source_url, price_amount, currency, status, readiness_issues, position").eq("brand_id", brand.id).neq("status", "hidden").order("position"),
    supabase.from("assets").select("product_id, source_url, metadata").eq("brand_id", brand.id).eq("kind", "product_source").order("created_at"),
  ]);
  if (productsError || assetsError) return Response.json({ error: "The saved catalog could not be loaded." }, { status: 500 });

  const firstImageByProduct = new Map<string, string>();
  for (const asset of assets ?? []) {
    if (asset.product_id && asset.source_url && !firstImageByProduct.has(asset.product_id)) firstImageByProduct.set(asset.product_id, asset.source_url);
  }
  const evidence = brand.evidence as { analysis?: { adAngles?: Array<{ name: string; rationale: string }> } } | null;

  return Response.json({
    brands: (brands ?? []).map((item) => ({ id: item.id, name: item.name ?? item.canonical_domain, domain: item.canonical_domain })),
    brand: {
      id: brand.id,
      name: brand.name ?? brand.canonical_domain,
      domain: brand.canonical_domain,
      logo: brand.logo_source_url,
      colors: Array.isArray(brand.colors) ? brand.colors : [],
      voice: brand.voice,
      audience: brand.audience,
      valueProposition: brand.value_proposition,
      adAngles: evidence?.analysis?.adAngles ?? [],
      researchStatus: brand.research_status,
    },
    products: (products ?? []).map((product) => ({ ...product, image_url: firstImageByProduct.get(product.id) ?? null })),
  });
}
