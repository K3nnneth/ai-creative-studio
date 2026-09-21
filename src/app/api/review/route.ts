import { z } from "zod";

import { DEMO_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const reviewSchema = z.object({
  brandId: z.string().uuid(),
  selectedProductId: z.string().uuid(),
  voice: z.string().trim().min(10).max(1000),
  audience: z.string().trim().min(10).max(1000),
  valueProposition: z.string().trim().min(10).max(1000),
  angle: z.string().trim().min(2).max(300),
});

export async function POST(request: Request) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Complete the brand fields and choose a product and ad angle." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const input = parsed.data;
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, title, status")
    .eq("id", input.selectedProductId)
    .eq("brand_id", input.brandId)
    .single();
  if (productError || !product) return Response.json({ error: "The selected catalog product was not found." }, { status: 404 });
  if (product.status !== "ready") return Response.json({ error: "Choose a product marked ready before continuing." }, { status: 409 });

  const { error: brandError } = await supabase.from("brands").update({
    voice: input.voice,
    audience: input.audience,
    value_proposition: input.valueProposition,
  }).eq("id", input.brandId).eq("workspace_id", DEMO_WORKSPACE_ID);
  if (brandError) return Response.json({ error: "The reviewed brand kit could not be saved." }, { status: 500 });

  const { data: campaign, error: campaignError } = await supabase.from("campaigns").insert({
    workspace_id: DEMO_WORKSPACE_ID,
    brand_id: input.brandId,
    product_id: product.id,
    name: `${product.title} campaign`,
    audience: input.audience,
    angle: input.angle,
    status: "draft",
  }).select("id, name, status, product_id, angle").single();
  if (campaignError || !campaign) return Response.json({ error: "The campaign draft could not be created." }, { status: 500 });

  return Response.json({ campaign });
}
