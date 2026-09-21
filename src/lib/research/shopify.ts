import { z } from "zod";

const imageSchema = z.object({
  src: z.string().url(),
  width: z.number().int().positive().nullish(),
  height: z.number().int().positive().nullish(),
  alt: z.string().nullish(),
});

const variantSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().optional(),
  price: z.union([z.string(), z.number()]),
  compare_at_price: z.union([z.string(), z.number()]).nullish(),
  available: z.boolean().optional(),
  sku: z.string().nullish(),
});

const productSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string().min(1),
  handle: z.string().min(1),
  body_html: z.string().nullish(),
  vendor: z.string().nullish(),
  product_type: z.string().nullish(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).default([]),
});

const productsResponseSchema = z.object({ products: z.array(productSchema) });

function textFromHtml(html?: string | null) {
  return html
    ?.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function amount(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type ShopifyProduct = ReturnType<typeof normalizeProduct>;

function normalizeProduct(product: z.infer<typeof productSchema>, origin: string, position: number) {
  const prices = product.variants.map((variant) => amount(variant.price)).filter((price): price is number => price !== null);
  const comparePrices = product.variants.map((variant) => amount(variant.compare_at_price)).filter((price): price is number => price !== null);
  const description = textFromHtml(product.body_html);
  const readinessIssues = [] as string[];
  if (!product.images.length) readinessIssues.push("No product image was found");
  if (!prices.length) readinessIssues.push("No product price was found");

  return {
    externalId: String(product.id),
    handle: product.handle,
    sourceUrl: new URL(`/products/${product.handle}`, origin).toString(),
    title: product.title,
    description: description || null,
    vendor: product.vendor || null,
    productType: product.product_type || null,
    priceAmount: prices.length ? Math.min(...prices) : null,
    compareAtPriceAmount: comparePrices.length ? Math.min(...comparePrices) : null,
    status: readinessIssues.length ? "needs_review" : "ready",
    readinessIssues,
    position,
    images: product.images,
    metadata: {
      tags: Array.isArray(product.tags) ? product.tags : product.tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
      variants: product.variants,
    },
  };
}

export async function fetchShopifyCatalog(storeUrl: string) {
  const origin = new URL(storeUrl).origin;
  const endpoint = new URL("/products.json?limit=50", origin);
  const response = await fetch(endpoint, {
    headers: { Accept: "application/json", "User-Agent": "AI-Creative-Studio/1.0" },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 404 ? "This store does not expose a Shopify product catalog." : `The Shopify catalog returned HTTP ${response.status}.`);
  }

  const parsed = productsResponseSchema.safeParse(await response.json());
  if (!parsed.success || !parsed.data.products.length) {
    throw new Error("No Shopify products were found at this store.");
  }

  return {
    endpoint: endpoint.toString(),
    products: parsed.data.products.map((product, index) => normalizeProduct(product, origin, index)),
  };
}
