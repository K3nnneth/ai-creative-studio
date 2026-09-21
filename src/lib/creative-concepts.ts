import { generateText } from "ai";
import { z } from "zod";

const conceptsSchema = z.array(z.object({
  headline: z.string().trim().min(2).max(64),
  cta: z.string().trim().min(2).max(30),
  treatment: z.string().trim().min(10).max(240),
})).length(3);

export type CreativeConcept = z.infer<typeof conceptsSchema>[number];

export async function createCreativeConcepts(input: {
  brandName: string;
  productTitle: string;
  productDescription: string | null;
  campaignAngle: string;
  audience: string | null;
  voice: string | null;
  valueProposition: string | null;
}) {
  const model = process.env.AI_MODEL?.trim() || "inclusionai/ling-3.0-flash-vl-free";
  try {
    const { text } = await generateText({
      model,
      temperature: 0.45,
      prompt: `Create three distinct concepts for a portrait ecommerce image ad. Return only a JSON array with exactly this shape:
[{"headline":"2-64 characters","cta":"2-30 characters","treatment":"10-240 characters"}]

Use only the supplied facts. Never invent a discount, product feature, material, guarantee, or offer. Each headline must fit naturally in an ad and each CTA must be a short action. The treatment describes photography only: setting, lighting, composition, and mood. It must not request text, labels, posters, packaging changes, extra products, or graphic layouts.

Brand: ${input.brandName}
Product: ${input.productTitle}
Description: ${input.productDescription?.slice(0, 1200) ?? "No description supplied"}
Campaign direction: ${input.campaignAngle}
Audience: ${input.audience ?? "Not specified"}
Brand voice: ${input.voice ?? "Not specified"}
Value proposition: ${input.valueProposition ?? "Not specified"}`,
    });
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return { concepts: conceptsSchema.parse(JSON.parse(json)), model };
  } catch {
    const product = input.productTitle.length <= 36 ? input.productTitle : "This customer favorite";
    const angle = input.campaignAngle.length <= 64 ? input.campaignAngle : `Meet ${product}`;
    return {
      concepts: [
        { headline: angle, cta: `Shop ${product}`.slice(0, 30), treatment: "Warm editorial product photography in a clean studio with soft directional light and an uncluttered neutral background." },
        { headline: `Meet ${product}`.slice(0, 64), cta: "Shop now", treatment: "Natural lifestyle product photography in a relevant everyday setting with realistic light and one clear focal point." },
        { headline: `${product}, your way`.slice(0, 64), cta: "Explore the product", treatment: "Bold premium product photography with a simple color backdrop, crisp lighting, and spacious portrait composition." },
      ] satisfies CreativeConcept[],
      model: "deterministic-fallback",
    };
  }
}
