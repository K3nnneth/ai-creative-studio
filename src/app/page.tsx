"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Check, LoaderCircle, Paintbrush, ScanSearch, Search, Sparkles, Store } from "lucide-react";
import { useRouter } from "next/navigation";

import { AppHeader } from "@/components/app-header";

type ResearchResult = {
  brand: {
    id: string;
    name: string;
    domain: string;
    colors: string[];
    logo: string | null;
    voice: string | null;
    audience: string | null;
    valueProposition: string | null;
    adAngles: Array<{ name: string; rationale: string }>;
  };
  products: Array<{ id: string; title: string; status: string; price_amount: number | null; currency: string }>;
  productCount: number;
  firecrawlCompleted: boolean;
  analysisCompleted: boolean;
  warning?: string;
};

function ResearchComplete({ result, retryingAnalysis, onRetryAnalysis }: { result: ResearchResult; retryingAnalysis: boolean; onRetryAnalysis: () => void }) {
  return (
    <div className="mx-auto mt-16 w-full max-w-[760px] rounded-[26px] border border-white/80 bg-white/90 p-6 text-left shadow-[0_24px_60px_rgba(42,37,65,0.12)] backdrop-blur-xl sm:mt-20 sm:p-8">
      <div className="flex items-start gap-4 border-b border-[#ece8f1] pb-6">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eeeafd] text-[#5c4cf2]"><Check className="size-5" strokeWidth={2.5} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#766f85]">Research complete</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#19171f]">{result.brand.name}</h2>
          <p className="mt-1 text-sm text-[#756e7e]">{result.brand.domain} · {result.productCount} real products saved</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {result.brand.colors.map((color) => <span className="size-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }} title={color} key={color} />)}
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${result.firecrawlCompleted ? "bg-[#edf9f1] text-[#247044]" : "bg-[#fff5dc] text-[#8a651b]"}`}>{result.firecrawlCompleted ? "Brand page analyzed" : "Brand analysis needs retry"}</span>
          </div>
        </div>
      </div>
      {result.analysisCompleted && (
        <div className="grid gap-4 border-b border-[#ece8f1] py-6 sm:grid-cols-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8495]">Voice</p><p className="mt-2 text-xs leading-5 text-[#514b58]">{result.brand.voice}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8495]">Audience</p><p className="mt-2 text-xs leading-5 text-[#514b58]">{result.brand.audience}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8495]">Value proposition</p><p className="mt-2 text-xs leading-5 text-[#514b58]">{result.brand.valueProposition}</p></div>
        </div>
      )}
      <div className="pt-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-[#29252f]">Catalog preview</h3><span className="text-[11px] text-[#8b8495]">First 5 of {result.productCount}</span></div>
        <div className="divide-y divide-[#eeeaf2] rounded-2xl border border-[#ebe7ef] bg-[#faf9fc] px-4">
          {result.products.slice(0, 5).map((product) => (
            <div className="flex items-center justify-between gap-4 py-3" key={product.id}>
              <div className="min-w-0"><p className="truncate text-xs font-semibold text-[#29252f]">{product.title}</p><p className="mt-0.5 text-[10px] capitalize text-[#8b8495]">{product.status.replace("_", " ")}</p></div>
              <span className="shrink-0 text-xs font-semibold text-[#514b58]">{product.price_amount === null ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency }).format(product.price_amount)}</span>
            </div>
          ))}
        </div>
        {result.brand.adAngles.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{result.brand.adAngles.map((angle) => <span className="rounded-full border border-[#ded8ea] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#5d5565]" title={angle.rationale} key={angle.name}>{angle.name}</span>)}</div>}
        {result.warning && <div className="mt-3 rounded-xl bg-[#fff8e8] p-3"><p className="text-xs text-[#8a651b]">{result.warning}</p>{result.firecrawlCompleted && !result.analysisCompleted && <button type="button" onClick={onRetryAnalysis} disabled={retryingAnalysis} className="mt-2 rounded-lg border border-[#d9c58c] bg-white px-3 py-2 text-[11px] font-semibold text-[#765617] disabled:opacity-50">{retryingAnalysis ? "Retrying analysis…" : "Retry brand analysis"}</button>}</div>}
        {result.analysisCompleted && <a className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#29252f] px-5 text-sm font-semibold text-white" href="/review">Review brand and catalog<ArrowRight className="size-4" /></a>}
      </div>
    </div>
  );
}

function CreativePrinter() {
  return (
    <div className="creative-printer mx-auto mt-10 max-w-[720px] rounded-[24px] border border-white/80 bg-white/78 p-5 shadow-[0_20px_55px_rgba(76,58,104,0.12)] backdrop-blur-md sm:p-6" aria-label="How it works: AI Creative Studio researches a store, finds its brand and products, builds concepts, and returns ads for review">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="text-left">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#777080]">How it works</p>
          <p className="mt-1 text-xs text-[#8b8493]">You provide the store. AI handles the research and design.</p>
        </div>
        <span className="rounded-full bg-[#eee9ff] px-2.5 py-1 text-[10px] font-bold text-[#6655ea]">AI powered</span>
      </div>

      <div className="studio-pipeline grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="pipeline-stage relative">
          <div className="storefront-card relative flex h-[118px] flex-col overflow-hidden rounded-2xl border border-[#e5dfeb] bg-white p-3 text-left shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-[#eee9f1] pb-2"><span className="size-1.5 rounded-full bg-[#ff8f91]" /><span className="size-1.5 rounded-full bg-[#ffca68]" /><span className="size-1.5 rounded-full bg-[#66d9dc]" /></div>
            <div className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-[#ddd7e5] bg-[#faf9fc] px-2.5 shadow-inner"><Search className="size-3 shrink-0 text-[#928a9b]" /><span className="typed-store-url text-[8px] font-semibold text-[#514a59]">www.yourstore.com</span><span className="url-caret h-3 w-px shrink-0 bg-[#6655ea]" /></div>
            <div className="mt-auto flex items-center gap-1.5 text-[8px] font-semibold text-[#8a8392]"><Store className="size-3 text-[#6655ea]" />Paste your store link</div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-[#777080]"><span className="mr-1.5 rounded-full bg-[#eee9ff] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#6655ea]">You</span>Add store URL</p>
          <span className="pipeline-arrow absolute -right-4 top-[52px] z-10 hidden size-4 place-items-center rounded-full bg-white text-[#aaa2b3] shadow-sm sm:grid"><ArrowRight className="size-2.5" /></span>
        </div>

        <div className="pipeline-stage relative">
          <div className="research-card relative flex h-[118px] flex-col overflow-hidden rounded-2xl border border-[#ded7eb] bg-[linear-gradient(145deg,#fbf8ff,#f4effc)] p-3 text-left shadow-sm">
            <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-white text-[#6655ea] shadow-sm"><ScanSearch className="size-4" /></span><div><p className="text-[9px] font-bold text-[#5b5363]">Researching</p><p className="text-[8px] text-[#9a92a2]">Brand + products</p></div></div>
            <div className="research-scan-line absolute left-2 right-2 top-12 h-px bg-[#745fff] shadow-[0_0_10px_#745fff]" />
            <div className="research-findings mt-auto rounded-lg border border-white bg-white/75 p-2"><div className="flex gap-1"><span className="size-3 rounded-full bg-[#ea789b]" /><span className="size-3 rounded-full bg-[#222029]" /><span className="size-3 rounded-full bg-[#f4db8d]" /></div><div className="mt-2 h-1.5 w-4/5 rounded-full bg-[#d7d0df]" /><div className="mt-1 h-1.5 w-1/2 rounded-full bg-[#e7e1eb]" /></div>
          </div>
          <p className="mt-3 text-[10px] font-semibold text-[#777080]"><span className="mr-1.5 rounded-full bg-[#e8f7f8] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#28777b]">AI</span>Researches your store</p>
          <span className="pipeline-arrow absolute -right-4 top-[52px] z-10 hidden size-4 place-items-center rounded-full bg-white text-[#aaa2b3] shadow-sm sm:grid"><ArrowRight className="size-2.5" /></span>
        </div>

        <div className="pipeline-stage relative">
          <div className="printer-shell relative flex h-[118px] items-center justify-center overflow-hidden rounded-[20px] border border-[#d9d0ee] bg-[linear-gradient(145deg,#6d5cf6,#5040d8)] px-3 text-white shadow-[0_16px_35px_rgba(92,76,242,0.25)]">
            <div className="printer-glow absolute inset-2 rounded-[15px] bg-white/10" />
            <div className="creative-canvas relative h-[92px] w-[58px] overflow-hidden rounded-[9px] border-2 border-white/80 bg-[#fff8f3] p-2 shadow-[0_10px_25px_rgba(35,25,94,0.28)]">
              <span className="canvas-product mx-auto block size-7 rounded-full bg-[linear-gradient(145deg,#ff8eaa,#f5c66f)]" />
              <span className="canvas-headline mt-2 block h-1.5 w-full origin-left rounded-full bg-[#302b38]" />
              <span className="canvas-headline canvas-headline-two mt-1 block h-1.5 w-3/4 origin-left rounded-full bg-[#302b38]/55" />
              <span className="canvas-cta mt-2 block h-3 w-full origin-left rounded-full bg-[#6655ea]" />
            </div>
            <Paintbrush className="creative-brush absolute size-5 -rotate-45 text-white drop-shadow-md" strokeWidth={2.4} />
            <Sparkles className="creative-sparkle absolute right-5 top-4 size-3.5 text-[#ffe48e]" />
          </div>
          <p className="mt-3 text-[10px] font-semibold text-[#777080]"><span className="mr-1.5 rounded-full bg-[#e8f7f8] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#28777b]">AI</span>Designs ad concepts</p>
          <span className="pipeline-arrow absolute -right-4 top-[52px] z-10 hidden size-4 place-items-center rounded-full bg-white text-[#aaa2b3] shadow-sm sm:grid"><ArrowRight className="size-2.5" /></span>
        </div>

        <div className="pipeline-stage">
          <div className="ad-stack relative mx-auto h-[118px] w-full">
            {["#25212c", "#ec789a", "#73cbd0"].map((color, index) => (
              <div className={`ad-output ad-output-${index + 1} absolute left-1/2 top-1/2 h-[105px] w-[59px] rounded-[10px] border-[3px] border-white p-2 text-left text-white shadow-[0_12px_24px_rgba(42,34,53,0.18)]`} style={{ backgroundColor: color }} key={color}>
                <div className="mx-auto mt-1 size-7 rounded-full bg-white/25" /><div className="mt-3 h-1.5 w-full rounded-full bg-white/85" /><div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-white/45" /><div className="mt-3 h-3 w-9 rounded-full bg-white/90" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-semibold text-[#777080]"><span className="mr-1.5 rounded-full bg-[#eee9ff] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#6655ea]">You</span>Review & approve</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [storeUrl, setStoreUrl] = useState("https://www.loopycases.com");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [researchResult, setResearchResult] = useState<ResearchResult>();
  const [retryingAnalysis, setRetryingAnalysis] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!storeUrl.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(undefined);

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: storeUrl }),
      });
      const responseBody = (await response.json()) as { error?: string; result?: ResearchResult };

      if (!response.ok || !responseBody.result) throw new Error(responseBody.error ?? "We couldn’t research this store. Please try again.");
      setResearchResult(responseBody.result);
      setSubmitted(true);
    } catch (error) {
      setSubmitted(false);
      setSubmitError(error instanceof Error ? error.message : "We couldn’t start research. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function retryBrandAnalysis() {
    if (!researchResult?.brand.id || retryingAnalysis) return;
    setRetryingAnalysis(true);
    setSubmitError(undefined);
    try {
      const response = await fetch("/api/research/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: researchResult.brand.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Brand analysis could not be completed.");
      router.push(`/review?brandId=${encodeURIComponent(researchResult.brand.id)}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Brand analysis could not be completed.");
    } finally {
      setRetryingAnalysis(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f0f7] text-[#1e1b24]">
      <AppHeader active="new" />

      <section className={`home-stage relative isolate overflow-hidden px-5 sm:px-8 ${submitted ? "pb-20 pt-16 sm:pt-20" : "flex min-h-[calc(100vh-68px)] items-center py-16"}`}>
        <div className="pointer-events-none absolute -left-32 top-[5%] -z-10 size-[460px] rounded-full bg-[#a873ff]/55 blur-[75px]" />
        <div className="pointer-events-none absolute -right-24 top-[12%] -z-10 size-[430px] rounded-full bg-[#ff8f91]/45 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 -z-10 size-[390px] rounded-full bg-[#66d9dc]/45 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-36 right-[8%] -z-10 size-[420px] rounded-full bg-[#ffca68]/50 blur-[85px]" />
        <div className="pointer-events-none absolute bottom-[10%] right-[30%] -z-10 size-[280px] rounded-full bg-[#f18dff]/35 blur-[80px]" />
        <div className="mx-auto max-w-[820px] text-center">
          <h1 className="text-balance text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] text-[#201d25] sm:text-[64px] lg:text-[76px]">Your store has the goods. We’ll make the ads.</h1>
          <p className="mx-auto mt-6 max-w-[560px] text-pretty text-[15px] leading-7 text-[#736c7b] sm:text-base">Paste your store URL and we’ll bring your products to life with ad ideas ready for your review.</p>
          <form onSubmit={handleSubmit} className="mx-auto mt-9 max-w-[680px]">
            <div className="flex flex-col gap-2 rounded-[22px] border border-[#ddd8e5] bg-white p-2 shadow-[0_18px_50px_rgba(48,40,69,0.10)] sm:flex-row sm:rounded-full">
              <label className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 sm:py-0"><Search className="size-[18px] shrink-0 text-[#9a92a3]" /><span className="sr-only">Store URL</span><input value={storeUrl} onChange={(event) => { setStoreUrl(event.target.value); setSubmitted(false); setResearchResult(undefined); setSubmitError(undefined); }} disabled={isSubmitting} className="w-full bg-transparent text-sm text-[#2c2731] outline-none placeholder:text-[#aaa3b0] disabled:opacity-60" placeholder="Paste a Shopify store URL" inputMode="url" /></label>
              <button disabled={isSubmitting} className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#5c4cf2] px-6 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(92,76,242,0.25)] transition hover:bg-[#5141e8] disabled:cursor-wait disabled:opacity-70 sm:rounded-full">{isSubmitting ? "Researching store" : researchResult?.warning && !researchResult.firecrawlCompleted ? "Retry research" : submitted ? "Research complete" : "Continue"}{isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : submitted && !researchResult?.warning ? <Check className="size-4" /> : <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />}</button>
            </div>
            <p className="mt-3 text-[11px] text-[#9991a1]">You’ll review everything before generation</p>
            {submitError && <p className="mt-3 text-sm font-medium text-[#a43c55]" role="alert">{submitError}</p>}
          </form>
          {!submitted && <CreativePrinter />}
        </div>
        {submitted && researchResult && <ResearchComplete result={researchResult} retryingAnalysis={retryingAnalysis} onRetryAnalysis={retryBrandAnalysis} />}
      </section>
    </main>
  );
}
