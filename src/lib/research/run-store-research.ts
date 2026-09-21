import type { BrandingProfile } from "@mendable/firecrawl-js";

import { getSupabaseAdmin } from "@/lib/supabase/server";
import { analyzeBrand } from "@/lib/research/brand-analysis";
import { researchBrandPage } from "@/lib/research/firecrawl";
import { fetchShopifyCatalog } from "@/lib/research/shopify";

type ProgressEntry = { step: string; status: "completed" | "failed"; at: string; detail?: string };

function now() {
  return new Date().toISOString();
}

function compactColors(branding: BrandingProfile) {
  return [...new Set(Object.values(branding.colors ?? {}).filter((value): value is string => typeof value === "string" && /^#[0-9a-f]{3,8}$/i.test(value)))].slice(0, 8);
}

function brandName(branding: BrandingProfile, metadata: Record<string, unknown>, domain: string) {
  if (branding.brandName?.trim()) return branding.brandName.trim();
  const title = typeof metadata.title === "string" ? metadata.title.split(/[|–—]/)[0].trim() : "";
  return title || domain.split(".")[0].replace(/(^|[-_])\w/g, (match) => match.replace(/[-_]/, " ").toUpperCase());
}

export async function runStoreResearch(input: { brandId: string; runId: string; storeUrl: string; canonicalDomain: string }) {
  const supabase = getSupabaseAdmin();
  const progress: ProgressEntry[] = [{ step: "url_validated", status: "completed", at: now() }];

  await supabase.from("research_runs").update({ status: "running", started_at: now(), progress }).eq("id", input.runId);

  try {
    const [catalogResult, brandResult] = await Promise.allSettled([
      fetchShopifyCatalog(input.storeUrl),
      researchBrandPage(input.storeUrl),
    ]);

    if (catalogResult.status === "rejected") throw catalogResult.reason;
    progress.push({ step: "shopify_catalog", status: "completed", at: now(), detail: `${catalogResult.value.products.length} products found` });

    const firecrawl = brandResult.status === "fulfilled" ? brandResult.value : null;
    const firecrawlError = brandResult.status === "rejected"
      ? brandResult.reason instanceof Error ? brandResult.reason.message : "Firecrawl failed"
      : null;
    progress.push({
      step: "firecrawl_brand_page",
      status: firecrawl ? "completed" : "failed",
      at: now(),
      detail: firecrawl ? "Homepage content and visual branding found" : firecrawlError ?? "Firecrawl failed",
    });

    const productRows = catalogResult.value.products.map((product) => ({
      brand_id: input.brandId,
      platform: "shopify",
      external_id: product.externalId,
      handle: product.handle,
      source_url: product.sourceUrl,
      title: product.title,
      description: product.description,
      vendor: product.vendor,
      product_type: product.productType,
      price_amount: product.priceAmount,
      compare_at_price_amount: product.compareAtPriceAmount,
      currency: "USD",
      status: product.status,
      readiness_issues: product.readinessIssues,
      position: product.position,
      metadata: product.metadata,
    }));

    const { error: hideError } = await supabase.from("products").update({ status: "hidden" }).eq("brand_id", input.brandId);
    if (hideError) throw new Error(hideError.message);

    const { data: savedProducts, error: productError } = await supabase
      .from("products")
      .upsert(productRows, { onConflict: "brand_id,external_id" })
      .select("id, external_id, title, status, price_amount, currency");
    if (productError || !savedProducts) throw new Error(productError?.message ?? "Products could not be saved.");

    const savedByExternalId = new Map(savedProducts.map((product) => [product.external_id, product]));
    const productIds = savedProducts.map((product) => product.id);
    if (productIds.length) await supabase.from("assets").delete().in("product_id", productIds).eq("kind", "product_source").eq("status", "remote");

    const assets = catalogResult.value.products.flatMap((product) => {
      const saved = savedByExternalId.get(product.externalId);
      if (!saved) return [];
      return product.images.slice(0, 8).map((image, imagePosition) => ({
        brand_id: input.brandId,
        product_id: saved.id,
        kind: "product_source",
        source_url: image.src,
        width: image.width ?? null,
        height: image.height ?? null,
        status: "remote",
        metadata: { alt: image.alt, position: imagePosition },
      }));
    });
    if (assets.length) {
      const { error: assetError } = await supabase.from("assets").insert(assets);
      if (assetError) throw new Error(assetError.message);
    }
    progress.push({ step: "catalog_saved", status: "completed", at: now(), detail: `${savedProducts.length} products saved` });

    const branding = firecrawl?.branding ?? {};
    const metadata = (firecrawl?.metadata ?? {}) as Record<string, unknown>;
    const logo = branding.logo ?? branding.images?.logo ?? (typeof metadata.ogImage === "string" ? metadata.ogImage : null);
    const detectedBrandName = brandName(branding, metadata, input.canonicalDomain);
    let brandAnalysis: Awaited<ReturnType<typeof analyzeBrand>> | null = null;
    let analysisError: string | null = null;
    if (firecrawl?.markdown) {
      try {
        brandAnalysis = await analyzeBrand({
          brandName: detectedBrandName,
          domain: input.canonicalDomain,
          homepageMarkdown: firecrawl.markdown,
          products: catalogResult.value.products,
        });
        progress.push({ step: "brand_analysis", status: "completed", at: now(), detail: `Analyzed with ${brandAnalysis.model}` });
      } catch (error) {
        analysisError = error instanceof Error ? error.message : "Brand analysis failed";
        console.error("Brand analysis failed " + JSON.stringify({ message: analysisError }));
        progress.push({ step: "brand_analysis", status: "failed", at: now(), detail: analysisError });
      }
    }

    const researchStatus = firecrawl && brandAnalysis ? "ready" : "researching";
    const { error: brandError } = await supabase.from("brands").update({
      name: detectedBrandName,
      logo_source_url: logo,
      colors: compactColors(branding),
      voice: brandAnalysis?.analysis.voice ?? branding.tone?.voice ?? branding.personality?.tone ?? null,
      audience: brandAnalysis?.analysis.audience ?? branding.personality?.targetAudience ?? null,
      value_proposition: brandAnalysis?.analysis.valueProposition ?? null,
      evidence: {
        sources: { catalog: catalogResult.value.endpoint, homepage: firecrawl?.homepage ?? null },
        firecrawl: firecrawl ? "completed" : "failed",
        firecrawlError: firecrawl ? null : progress.find((entry) => entry.step === "firecrawl_brand_page")?.detail,
        analysis: brandAnalysis ? { model: brandAnalysis.model, adAngles: brandAnalysis.analysis.adAngles, fieldEvidence: brandAnalysis.analysis.evidence } : null,
        analysisError,
      },
      research_status: researchStatus,
      last_researched_at: now(),
    }).eq("id", input.brandId);
    if (brandError) throw new Error(brandError.message);

    const rawResult = {
      shopify: { endpoint: catalogResult.value.endpoint, productCount: catalogResult.value.products.length },
      firecrawl,
      analysis: brandAnalysis,
    };
    const { error: runError } = await supabase.from("research_runs").update({
      status: "completed",
      progress,
      raw_result: rawResult,
      completed_at: now(),
      error_message: firecrawl ? null : "Catalog completed, but Firecrawl brand research failed.",
    }).eq("id", input.runId);
    if (runError) throw new Error(runError.message);

    return {
      brand: {
        id: input.brandId,
        name: detectedBrandName,
        domain: input.canonicalDomain,
        colors: compactColors(branding),
        logo,
        voice: brandAnalysis?.analysis.voice ?? null,
        audience: brandAnalysis?.analysis.audience ?? null,
        valueProposition: brandAnalysis?.analysis.valueProposition ?? null,
        adAngles: brandAnalysis?.analysis.adAngles ?? [],
      },
      products: savedProducts,
      productCount: savedProducts.length,
      firecrawlCompleted: Boolean(firecrawl),
      analysisCompleted: Boolean(brandAnalysis),
      warning: !firecrawl ? "Products were saved, but brand research needs to be retried." : analysisError ? "Research was saved, but AI brand analysis needs to be retried." : firecrawl.warning,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Store research failed.";
    progress.push({ step: "research", status: "failed", at: now(), detail: message });
    await Promise.all([
      supabase.from("research_runs").update({ status: "failed", progress, error_message: message, completed_at: now() }).eq("id", input.runId),
      supabase.from("brands").update({ research_status: "failed" }).eq("id", input.brandId),
    ]);
    throw new Error(message);
  }
}
