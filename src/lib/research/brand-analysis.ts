import { generateText } from "ai";
import { z } from "zod";

const brandAnalysisSchema = z.object({
  voice: z.string().min(10).max(500),
  audience: z.string().min(10).max(500),
  valueProposition: z.string().min(10).max(500),
  adAngles: z.array(z.object({
    name: z.string().min(2).max(80),
    rationale: z.string().min(10).max(300),
  })).min(3),
  evidence: z.object({
    voice: z.array(z.string().max(220)).min(1),
    audience: z.array(z.string().max(220)).min(1),
    valueProposition: z.array(z.string().max(220)).min(1),
  }),
});

export type BrandAnalysis = z.infer<typeof brandAnalysisSchema>;

export async function analyzeBrand(input: {
  brandName: string;
  domain: string;
  homepageMarkdown: string;
  products: Array<{ title: string; description: string | null; productType: string | null; priceAmount: number | null }>;
}) {
  const model = process.env.AI_MODEL?.trim() || "inclusionai/ling-3.0-flash-vl-free";
  const { text } = await generateText({
    model,
    temperature: 0.2,
    prompt: `Analyze this ecommerce brand for a marketer preparing image ads. Return only valid JSON with this exact shape:
{"voice":"string","audience":"string","valueProposition":"string","adAngles":[{"name":"string","rationale":"string"}],"evidence":{"voice":["string"],"audience":["string"],"valueProposition":["string"]}}

Use only the supplied store evidence. Describe what the evidence supports; do not invent demographics, guarantees, or product benefits. Keep each field concise and practical. Evidence entries must be short snippets or close paraphrases traceable to the supplied text. Ad angles are suggestions and should be clearly grounded in the catalog or homepage.

Brand: ${input.brandName}
Domain: ${input.domain}

Homepage evidence:
${input.homepageMarkdown.slice(0, 18_000)}

Catalog sample:
${input.products.slice(0, 15).map((product) => `- ${product.title} | ${product.productType ?? "Uncategorized"} | ${product.priceAmount ?? "Price unavailable"} | ${product.description?.slice(0, 500) ?? "No description"}`).join("\n")}`,
  });

  const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = brandAnalysisSchema.parse(JSON.parse(json));
  const analysis: BrandAnalysis = {
    ...parsed,
    adAngles: parsed.adAngles.slice(0, 5),
    evidence: {
      voice: parsed.evidence.voice.slice(0, 3),
      audience: parsed.evidence.audience.slice(0, 3),
      valueProposition: parsed.evidence.valueProposition.slice(0, 3),
    },
  };
  return { analysis, model };
}
