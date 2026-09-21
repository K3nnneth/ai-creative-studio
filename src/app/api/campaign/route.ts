import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();
  const requestedId = new URL(request.url).searchParams.get("id");
  if (requestedId && !z.string().uuid().safeParse(requestedId).success) return Response.json({ error: "The campaign ID is invalid." }, { status: 400 });
  let query = supabase
    .from("campaigns")
    .select("id, name, status, angle, audience, product_id, brands(name, voice, value_proposition, colors), products(title, description, price_amount, currency, source_url)")
    .eq("workspace_id", DEMO_WORKSPACE_ID);
  query = requestedId ? query.eq("id", requestedId) : query.order("created_at", { ascending: false }).limit(1);
  const { data: campaign, error } = await query.maybeSingle();
  if (error) {
    console.error("Campaign load failed " + JSON.stringify(error));
    return Response.json({ error: "The campaign could not be loaded." }, { status: 500 });
  }
  if (!campaign) return Response.json({ campaign: null });

  const [{ data: asset }, { data: creatives }] = await Promise.all([
    supabase.from("assets").select("source_url, storage_bucket, storage_path").eq("product_id", campaign.product_id).eq("kind", "product_source").order("created_at").limit(1).maybeSingle(),
    supabase.from("creatives").select("id, parent_creative_id, version, headline, cta, status, feedback_summary, generation_metadata").eq("campaign_id", campaign.id).order("created_at", { ascending: false }).limit(6),
  ]);
  return Response.json({ campaign: { ...campaign, imageUrl: asset?.source_url ?? null, creatives: (creatives ?? []).reverse() } });
}
