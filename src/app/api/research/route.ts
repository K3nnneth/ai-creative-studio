import { z } from "zod";

import { runStoreResearch } from "@/lib/research/run-store-research";
import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePublicStoreUrl } from "@/lib/store-url";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a store URL as JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter a valid store URL." }, { status: 400 });

  let store: Awaited<ReturnType<typeof normalizePublicStoreUrl>>;
  try {
    store = await normalizePublicStoreUrl(parsed.data.url);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Enter a valid store URL." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .upsert(
      {
        workspace_id: DEMO_WORKSPACE_ID,
        source_url: store.normalizedUrl,
        canonical_domain: store.canonicalDomain,
        research_status: "researching",
      },
      { onConflict: "workspace_id,canonical_domain" },
    )
    .select("id, canonical_domain, source_url, research_status")
    .single();

  if (brandError || !brand) {
    console.error("Unable to create brand " + JSON.stringify({
      code: brandError?.code,
      details: brandError?.details,
      hint: brandError?.hint,
      message: brandError?.message,
    }));
    return Response.json({ error: "We couldn’t start research. Please try again." }, { status: 500 });
  }

  const { data: researchRun, error: runError } = await supabase
    .from("research_runs")
    .insert({
      brand_id: brand.id,
      requested_url: store.normalizedUrl,
      status: "queued",
      progress: [{ step: "url_validated", status: "completed", at: new Date().toISOString() }],
    })
    .select("id, status, created_at")
    .single();

  if (runError || !researchRun) {
    console.error("Unable to create research run " + JSON.stringify({
      code: runError?.code,
      details: runError?.details,
      hint: runError?.hint,
      message: runError?.message,
    }));
    await supabase.from("brands").update({ research_status: "failed" }).eq("id", brand.id);
    return Response.json({ error: "We couldn’t queue research. Please try again." }, { status: 500 });
  }

  try {
    const result = await runStoreResearch({
      brandId: brand.id,
      runId: researchRun.id,
      storeUrl: store.normalizedUrl,
      canonicalDomain: store.canonicalDomain,
    });
    return Response.json({ brand, researchRun, result });
  } catch (error) {
    console.error("Store research failed " + JSON.stringify({ message: error instanceof Error ? error.message : "Unknown error" }));
    return Response.json(
      { error: error instanceof Error ? error.message : "Store research failed. Please try again." },
      { status: 422 },
    );
  }
}
