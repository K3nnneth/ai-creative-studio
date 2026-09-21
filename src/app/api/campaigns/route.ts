import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data: campaigns, error } = await supabase.from("campaigns")
    .select("id, name, status, angle, created_at, updated_at, products(title, price_amount, currency), brands(name)")
    .eq("workspace_id", DEMO_WORKSPACE_ID)
    .order("updated_at", { ascending: false });
  if (error) return Response.json({ error: "Saved campaigns could not be loaded." }, { status: 500 });

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);
  const { data: creatives } = campaignIds.length
    ? await supabase.from("creatives").select("campaign_id, status, generation_metadata").in("campaign_id", campaignIds).order("created_at", { ascending: false })
    : { data: [] };
  const previews = new Map<string, { count: number; imageUrl: string | null }>();
  for (const creative of creatives ?? []) {
    const current = previews.get(creative.campaign_id) ?? { count: 0, imageUrl: null };
    current.count += 1;
    current.imageUrl ??= creative.generation_metadata?.finalUrl ?? creative.generation_metadata?.backgroundUrl ?? null;
    previews.set(creative.campaign_id, current);
  }
  return Response.json({ campaigns: (campaigns ?? []).map((campaign) => ({ ...campaign, creativeCount: previews.get(campaign.id)?.count ?? 0, imageUrl: previews.get(campaign.id)?.imageUrl ?? null })) });
}
