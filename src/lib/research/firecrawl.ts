import Firecrawl from "@mendable/firecrawl-js";

export async function researchBrandPage(storeUrl: string) {
  const apiKey = process.env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured.");

  const homepage = new URL("/", storeUrl).toString();
  const client = new Firecrawl({ apiKey, timeoutMs: 45_000, maxRetries: 1 });
  const document = await client.scrape(homepage, {
    formats: ["markdown", "branding"],
    onlyMainContent: false,
    removeBase64Images: true,
    timeout: 40_000,
  });

  return {
    homepage,
    markdown: document.markdown?.slice(0, 30_000) ?? "",
    metadata: document.metadata ?? {},
    branding: document.branding ?? {},
    warning: document.warning,
  };
}
