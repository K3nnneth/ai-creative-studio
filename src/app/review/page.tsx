"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";

type Brand = {
  id: string;
  name: string;
  domain: string;
  logo: string | null;
  colors: string[];
  voice: string | null;
  audience: string | null;
  valueProposition: string | null;
  adAngles: Array<{ name: string; rationale: string }>;
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  source_url: string;
  price_amount: number | null;
  currency: string;
  status: string;
  readiness_issues: string[];
  image_url: string | null;
};

type SavedBrand = { id: string; name: string; domain: string };
type WorkspaceResponse = { brand: Brand; brands: SavedBrand[]; products: Product[]; error?: string };

export default function ReviewPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<Brand>();
  const [brands, setBrands] = useState<SavedBrand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [voice, setVoice] = useState("");
  const [audience, setAudience] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [angle, setAngle] = useState("");
  const [loading, setLoading] = useState(true);
  const [switchingBrand, setSwitchingBrand] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [campaign, setCampaign] = useState<{ id: string; name: string; angle: string }>();

  async function loadWorkspace(brandId?: string) {
    const response = await fetch(brandId ? `/api/workspace?brandId=${encodeURIComponent(brandId)}` : "/api/workspace");
    const data = await response.json() as WorkspaceResponse;
    if (!response.ok || !data.brand) throw new Error(data.error ?? "No researched brand was found.");
    setBrand(data.brand);
    setBrands(data.brands);
    setProducts(data.products);
    setSelectedProductId("");
    setVoice(data.brand.voice ?? "");
    setAudience(data.brand.audience ?? "");
    setValueProposition(data.brand.valueProposition ?? "");
    setAngle(data.brand.adAngles[0]?.name ?? "");
    setCampaign(undefined);
  }

  useEffect(() => {
    const requestedBrandId = new URL(window.location.href).searchParams.get("brandId") ?? undefined;
    fetch(requestedBrandId ? `/api/workspace?brandId=${encodeURIComponent(requestedBrandId)}` : "/api/workspace")
      .then(async (response) => {
        const data = await response.json() as WorkspaceResponse;
        if (!response.ok || !data.brand) throw new Error(data.error ?? "No researched brand was found.");
        setBrand(data.brand);
        setBrands(data.brands);
        setProducts(data.products);
        setVoice(data.brand.voice ?? "");
        setAudience(data.brand.audience ?? "");
        setValueProposition(data.brand.valueProposition ?? "");
        setAngle(data.brand.adAngles[0]?.name ?? "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "The workspace could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function changeBrand(brandId: string) {
    if (brandId === brand?.id) return;
    setSwitchingBrand(true);
    setError(undefined);
    try {
      await loadWorkspace(brandId);
      router.replace(`/review?brandId=${encodeURIComponent(brandId)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The catalog could not be loaded.");
    } finally {
      setSwitchingBrand(false);
    }
  }

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId), [products, selectedProductId]);
  const customAngle = brand?.adAngles.some((item) => item.name === angle) ? "" : angle;
  const valueFocus = valueProposition.split(/[.;]/)[0]?.trim();
  const customAngleExample = selectedProduct
    ? `Example: Show ${selectedProduct.title} in an everyday moment${valueFocus ? ` and focus on ${valueFocus.toLowerCase()}` : ""}`
    : `Example: Focus on what makes ${brand?.name ?? "this brand"} different`;

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!brand || !selectedProductId) return setError("Choose one product before continuing.");
    setSaving(true);
    setError(undefined);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id, selectedProductId, voice, audience, valueProposition, angle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The review could not be saved.");
      setCampaign(data.campaign);
      router.push(`/campaign?id=${data.campaign.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The review could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="min-h-screen bg-[#f3f0f7]"><AppHeader active="catalog" /><div className="grid min-h-[calc(100vh-68px)] place-items-center"><LoaderCircle className="size-7 animate-spin text-[#5c4cf2]" aria-label="Loading saved research" /></div></main>;
  if (!brand) return <main className="min-h-screen bg-[#f3f0f7]"><AppHeader active="catalog" /><div className="grid min-h-[calc(100vh-68px)] place-items-center p-6"><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="text-sm text-[#a43c55]">{error}</p><button type="button" className="mt-4 rounded-xl bg-[#29252f] px-4 py-2.5 text-xs font-semibold text-white" onClick={() => window.location.reload()}>Try again</button></div></div></main>;

  return (
    <main className="min-h-screen bg-[#f3f0f7] text-[#1e1b24]">
      <AppHeader active="catalog" />
      <form className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12" onSubmit={saveReview}>
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#655e6d] shadow-sm"><Sparkles className="size-3.5 text-[#6655ea]" />Human review</div><h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">Choose what we advertise.</h1><p className="mt-3 max-w-[620px] text-sm leading-6 text-[#756e7e]">Correct the research if needed, then select one real product. Nothing is generated until you confirm this checkpoint.</p></div>
          <label className="min-w-56 rounded-2xl border border-white bg-white/75 px-4 py-3 text-left shadow-sm"><span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b8495]">Store catalog</span><select className="mt-1 block w-full bg-transparent text-xs font-semibold outline-none" value={brand.id} disabled={switchingBrand} onChange={(event) => changeBrand(event.target.value)}>{brands.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span className="mt-1 block text-[11px] text-[#8b8495]">{switchingBrand ? "Loading catalog…" : `${brand.domain} · ${products.length} products`}</span></label>
        </div>

        <section className="rounded-[28px] border border-white bg-white/85 p-5 shadow-[0_20px_60px_rgba(50,40,70,0.08)] sm:p-7">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8495]">1 · Brand kit</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Review the agent’s interpretation</h2></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b8495]">Colors extracted from the store</p><div className="flex gap-1.5">{brand.colors.map((color) => <span className="size-6 rounded-full border border-black/10" style={{ backgroundColor: color }} title={color} aria-label={color} key={color} />)}</div></div></div>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="text-xs font-semibold text-[#514b58]">Voice<textarea className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#ddd7e5] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#7868ed]" value={voice} onChange={(event) => setVoice(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#514b58]">Audience<textarea className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#ddd7e5] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#7868ed]" value={audience} onChange={(event) => setAudience(event.target.value)} /></label>
            <label className="text-xs font-semibold text-[#514b58]">Value proposition<textarea className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-[#ddd7e5] bg-white p-3 text-sm font-normal leading-6 outline-none focus:border-[#7868ed]" value={valueProposition} onChange={(event) => setValueProposition(event.target.value)} /></label>
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white bg-white/85 p-5 shadow-[0_20px_60px_rgba(50,40,70,0.08)] sm:p-7">
          <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8495]">2 · Catalog</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Select one product for this campaign</h2><p className="mt-1 text-xs text-[#8b8495]">Products marked ready have both a price and a real source image. You can return and create another campaign for a different product.</p></div>
          <div className="grid max-h-[620px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-5">
            {products.map((product) => {
              const selected = product.id === selectedProductId;
              return <button className={`overflow-hidden rounded-2xl border bg-white text-left transition ${selected ? "border-[#6555ee] ring-2 ring-[#6555ee]/20" : "border-[#e8e3ed] hover:border-[#bdb4cb]"}`} disabled={product.status !== "ready"} key={product.id} onClick={() => setSelectedProductId(product.id)} type="button"><div className="aspect-square bg-[#f2eef5] bg-contain bg-center bg-no-repeat" style={product.image_url ? { backgroundImage: `url(${JSON.stringify(product.image_url).slice(1, -1)})` } : undefined} /><div className="p-3"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-xs font-semibold leading-4">{product.title}</p>{selected && <Check className="size-4 shrink-0 text-[#6555ee]" />}</div><p className="mt-2 text-[11px] text-[#746d7c]">{product.price_amount === null ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).format(product.price_amount)}</p><p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.08em] ${product.status === "ready" ? "text-[#2d7c4d]" : "text-[#a36d2b]"}`}>{product.status.replace("_", " ")}</p></div></button>;
            })}
          </div>
        </section>

        <section className="mt-5 rounded-[28px] border border-white bg-white/85 p-5 shadow-[0_20px_60px_rgba(50,40,70,0.08)] sm:p-7">
          <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8495]">3 · Direction</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">Choose the first ad angle</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{brand.adAngles.map((item) => <label className={`cursor-pointer rounded-2xl border p-4 ${angle === item.name ? "border-[#6555ee] bg-[#f7f5ff] ring-2 ring-[#6555ee]/15" : "border-[#e5e0ea] bg-white"}`} key={item.name}><input className="sr-only" type="radio" name="angle" value={item.name} checked={angle === item.name} onChange={() => setAngle(item.name)} /><p className="text-xs font-semibold">{item.name}</p><p className="mt-1.5 text-[11px] leading-5 text-[#7c7484]">{item.rationale}</p></label>)}</div>
          <label className={`mt-3 block rounded-2xl border p-4 ${customAngle ? "border-[#6555ee] bg-[#f7f5ff] ring-2 ring-[#6555ee]/15" : "border-[#e5e0ea] bg-white"}`}><span className="text-xs font-semibold">Suggest your own angle</span><span className="mt-1 block text-[11px] text-[#7c7484]">Describe the message or offer you want the ad to focus on.</span><textarea className="mt-3 min-h-20 w-full resize-y rounded-xl border border-[#ddd7e5] bg-white p-3 text-sm outline-none focus:border-[#7868ed]" placeholder={customAngleExample} value={customAngle} onChange={(event) => setAngle(event.target.value)} /></label>
        </section>

        <div className="sticky bottom-4 mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-[0_16px_50px_rgba(44,35,61,0.15)] backdrop-blur-xl sm:flex-row sm:pl-5"><p className="text-xs text-[#706978]">{selectedProduct ? <><span className="font-semibold text-[#29252f]">Selected:</span> {selectedProduct.title}</> : "Select a product to continue"}</p><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5c4cf2] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45" disabled={!selectedProduct || angle.trim().length < 2 || saving || Boolean(campaign)}>{saving ? "Saving review" : campaign ? "Campaign draft created" : "Confirm and continue"}{saving ? <LoaderCircle className="size-4 animate-spin" /> : campaign ? <Check className="size-4" /> : <ArrowRight className="size-4" />}</button></div>
        {error && <p className="mt-3 text-center text-sm font-medium text-[#a43c55]" role="alert">{error}</p>}
        {campaign && <p className="mt-3 text-center text-sm font-medium text-[#247044]">Saved “{campaign.name}” with the “{campaign.angle}” direction. <a className="underline underline-offset-4" href={`/campaign?id=${campaign.id}`}>Open campaign workspace</a></p>}
      </form>
    </main>
  );
}
