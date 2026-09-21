"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Check, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { AppHeader } from "@/components/app-header";

type Creative = {
  id: string;
  parent_creative_id?: string | null;
  version?: number;
  headline: string;
  cta: string;
  status: string;
  feedback_summary?: string | null;
  generation_metadata: { backgroundUrl?: string; finalUrl?: string; concept?: number };
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  angle: string;
  audience: string;
  imageUrl: string | null;
  brands: { name: string; voice: string; value_proposition: string; colors: string[] };
  products: { title: string; description: string | null; price_amount: number | null; currency: string };
  creatives: Creative[];
};

function AdvisorPart({ part, index }: { part: unknown; index: number }) {
  const item = part as { type?: string; state?: string; output?: { product?: string; creatives?: Array<{ concept: number; headline: string; cta: string; status: string }> } };
  if (item.type === "text") return <MessageResponse key={index}>{(part as { text: string }).text}</MessageResponse>;
  if (item.type !== "tool-getCampaignCreatives") return null;
  if (item.state !== "output-available" || !item.output) return <div key={index} className="flex items-center gap-2 rounded-xl bg-[#f5f2fa] p-3 text-xs text-[#756e7e]"><LoaderCircle className="size-3.5 animate-spin" />Reviewing saved creatives</div>;
  return <div key={index} className="rounded-2xl border border-[#e3ddec] bg-[#faf9fc] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#817989]">Creative set loaded</p><p className="mt-1 text-xs text-[#655e6d]">{item.output.product}</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{item.output.creatives?.map((creative) => <div className="rounded-xl bg-white p-3 shadow-sm" key={`${creative.concept}-${creative.headline}`}><p className="text-[9px] font-bold uppercase text-[#6655ea]">Concept {creative.concept}</p><p className="mt-1 text-xs font-semibold text-[#29252f]">{creative.headline}</p><p className="mt-1 text-[10px] text-[#817989]">{creative.cta}</p></div>)}</div></div>;
}

function CampaignChat({ campaign }: { campaign: Campaign }) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { campaignId: campaign.id } }), [campaign.id]);
  const { messages, sendMessage, regenerate, clearError, status, error } = useChat({
    transport,
    messages: [{ id: "welcome", role: "assistant", parts: [{ type: "text", text: `I can help you explore more ideas for **${campaign.products.title}** while staying grounded in the **${campaign.angle}** direction. Ask for a new angle, headline, or visual approach.` }] }],
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || status === "streaming" || status === "submitted") return;
    sendMessage({ text: input });
    setInput("");
  }

  return <section className="flex min-h-[420px] flex-col rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_20px_60px_rgba(50,40,70,0.08)] sm:p-6">
    <div className="border-b border-[#ece8f1] pb-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8495]">Creative advisor</p><h2 className="mt-1 text-lg font-semibold">Explore another direction</h2><p className="mt-1 text-xs text-[#817989]">Use chat to brainstorm. Use feedback on a selected creative when you want to generate a new version.</p></div>
    <div className="flex-1 space-y-5 overflow-y-auto py-5">
      {messages.map((message) => <Message from={message.role} key={message.id}><MessageContent>{message.parts.map((part, index) => <AdvisorPart part={part} index={index} key={index} />)}</MessageContent></Message>)}
      {(status === "submitted" || status === "streaming") && <div className="flex items-center gap-2 text-xs text-[#7b7383]"><LoaderCircle className="size-3.5 animate-spin" />Agent is responding</div>}
      {error && <div className="rounded-xl bg-[#fff0f3] p-3"><p className="text-xs font-medium text-[#a43c55]">The advisor could not respond.</p><button type="button" className="mt-2 text-[11px] font-semibold text-[#6b4050] underline underline-offset-2" onClick={() => { clearError(); regenerate(); }}>Try again</button></div>}
    </div>
    <form className="flex gap-2 rounded-2xl border border-[#ddd7e5] bg-white p-2" onSubmit={submit}><input className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="What do you think of the generated creatives?" value={input} onChange={(event) => setInput(event.target.value)} /><button className="grid size-10 place-items-center rounded-xl bg-[#5c4cf2] text-white disabled:opacity-40" disabled={!input.trim() || status === "streaming" || status === "submitted"} aria-label="Send message"><ArrowUp className="size-4" /></button></form>
  </section>;
}

export default function CampaignPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign>();
  const [error, setError] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"edit" | "regenerate" | "approve">();
  const [notice, setNotice] = useState<string>();
  const [generating, setGenerating] = useState(false);

  async function loadCampaign() {
    const campaignId = new URL(window.location.href).searchParams.get("id");
    const response = await fetch(campaignId ? `/api/campaign?id=${encodeURIComponent(campaignId)}` : "/api/campaign");
    const data = await response.json();
    if (!response.ok || !data.campaign) throw new Error(data.error ?? "No campaign was found.");
    setCampaign(data.campaign);
    setSelectedId((current) => current ?? data.campaign.creatives[0]?.id);
  }

  useEffect(() => {
    const campaignId = new URL(window.location.href).searchParams.get("id");
    fetch(campaignId ? `/api/campaign?id=${encodeURIComponent(campaignId)}` : "/api/campaign").then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.campaign) throw new Error(data.error ?? "No campaign was found.");
      const first = data.campaign.creatives[0] as Creative | undefined;
      setCampaign(data.campaign);
      setSelectedId(first?.id);
      setHeadline(first?.headline ?? "");
      setCta(first?.cta ?? "");
      setFeedback(first?.feedback_summary ?? "");
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Campaign could not be loaded."));
  }, []);
  const selected = campaign?.creatives.find((creative) => creative.id === selectedId);

  function selectCreative(creative: Creative) {
    setSelectedId(creative.id);
    setHeadline(creative.headline);
    setCta(creative.cta);
    setFeedback(creative.feedback_summary ?? "");
    setNotice(undefined);
  }

  async function updateCreative(payload: Record<string, string>, action: "edit" | "approve") {
    if (!selected) return;
    setBusy(action);
    setNotice(undefined);
    try {
      const response = await fetch("/api/creative", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, creativeId: selected.id, ...payload }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The creative could not be updated.");
      if (action === "approve") {
        router.push("/campaigns");
        return;
      }
      await loadCampaign();
      setNotice("Copy changes applied to the saved ad.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "The creative could not be updated."); }
    finally { setBusy(undefined); }
  }

  async function regenerate() {
    if (!selected || feedback.trim().length < 3) return;
    setBusy("regenerate"); setNotice(undefined);
    try {
      if (headline.trim() !== selected.headline || cta.trim() !== selected.cta) {
        const copyResponse = await fetch("/api/creative", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "edit", creativeId: selected.id, headline, cta }) });
        const copyData = await copyResponse.json();
        if (!copyResponse.ok) throw new Error(copyData.error ?? "Copy changes could not be applied.");
      }
      const feedbackResponse = await fetch("/api/creative", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "feedback", creativeId: selected.id, feedback }) });
      const feedbackData = await feedbackResponse.json();
      if (!feedbackResponse.ok) throw new Error(feedbackData.error ?? "Feedback could not be saved.");
      const response = await fetch("/api/creative/regenerate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creativeId: selected.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The variant could not be generated.");
      setSelectedId(data.variant.id);
      await loadCampaign();
      setNotice("A new variant was created from your feedback.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "The variant could not be generated."); }
    finally { setBusy(undefined); }
  }

  async function generateConcepts() {
    if (!campaign) return;
    setGenerating(true); setNotice(undefined);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Concept generation failed.");
      const renderResponse = await fetch("/api/creatives/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: campaign.id }) });
      const renderData = await renderResponse.json();
      if (!renderResponse.ok) throw new Error(renderData.error ?? "The final ads could not be rendered.");
      await loadCampaign();
      setNotice("Three concepts are ready for review.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Concept generation failed."); }
    finally { setGenerating(false); }
  }

  if (!campaign && !error) return <main className="min-h-screen bg-[#f3f0f7]"><AppHeader active="campaigns" /><div className="grid min-h-[calc(100vh-68px)] place-items-center"><LoaderCircle className="size-7 animate-spin text-[#5c4cf2]" /></div></main>;
  if (!campaign) return <main className="min-h-screen bg-[#f3f0f7]"><AppHeader active="campaigns" /><div className="grid min-h-[calc(100vh-68px)] place-items-center p-6"><div className="rounded-2xl bg-white p-6 text-center shadow-sm"><p className="text-sm text-[#a43c55]">{error}</p><button className="mt-4 rounded-xl bg-[#29252f] px-4 py-2.5 text-xs font-semibold text-white" onClick={() => window.location.reload()}>Try again</button></div></div></main>;

  return <main className="min-h-screen bg-[#f3f0f7] text-[#1e1b24]"><AppHeader active="campaigns" /><div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">
    <button type="button" onClick={() => router.back()} className="mb-7 text-xs font-semibold text-[#6655ea]">← Back</button><div className="mb-7"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-[#655e6d] shadow-sm"><Sparkles className="size-3.5 text-[#6655ea]" />Campaign workspace</div><h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">{campaign.products.title}</h1></div>
    <section className="grid overflow-hidden rounded-[28px] border border-white bg-white/90 shadow-[0_20px_60px_rgba(50,40,70,0.08)] lg:grid-cols-[0.82fr_1.18fr]">
      <div className="min-h-[360px] bg-[#f2eef5] bg-contain bg-center bg-no-repeat lg:min-h-[600px]" style={campaign.imageUrl ? { backgroundImage: `url(${JSON.stringify(campaign.imageUrl).slice(1, -1)})` } : undefined} />
      <div className="flex flex-col justify-between p-6 sm:p-9 lg:p-12"><div><h2 className="text-2xl font-semibold tracking-[-0.025em]">{campaign.products.title}</h2><p className="mt-2 text-sm text-[#655e6d]">{campaign.products.price_amount === null ? "Price unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: campaign.products.currency }).format(campaign.products.price_amount)}</p><div className="mt-8 border-t border-[#ece8f1] pt-6"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8495]">Audience</p><p className="mt-2 text-base leading-7 text-[#5e5765]">{campaign.audience}</p></div><div className="mt-6 border-t border-[#ece8f1] pt-6"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#8b8495]">Campaign direction</p><p className="mt-2 text-base leading-7 text-[#5e5765]">{campaign.angle}</p></div></div>{campaign.creatives.length === 0 && <div className="mt-10"><button type="button" disabled={generating} onClick={generateConcepts} className="inline-flex items-center gap-2 rounded-xl bg-[#5c4cf2] px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(92,76,242,0.22)] disabled:opacity-60">{generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{generating ? "Creating concepts…" : "Create three concepts"}</button>{generating && <p className="mt-3 text-[11px] text-[#938a9b]">This may take a few minutes. Keep this page open.</p>}{notice && <p className="mt-4 text-xs font-medium text-[#a43c55]">{notice}</p>}</div>}</div>
    </section>
    {campaign.creatives.length > 0 && <section className="mt-5 rounded-[26px] border border-white bg-white/90 p-5 shadow-[0_20px_60px_rgba(50,40,70,0.08)] sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b8495]">Creative review</p><h2 className="mt-1 text-xl font-semibold">Choose and refine a concept</h2><p className="mt-1 text-xs text-[#817989]">Select a portrait to edit its exact copy, leave feedback, or approve it.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">{campaign.creatives.map((creative) => { const imageUrl = creative.generation_metadata.finalUrl ?? creative.generation_metadata.backgroundUrl; const active = creative.id === selectedId; return <button type="button" onClick={() => selectCreative(creative)} className={`overflow-hidden rounded-2xl border bg-white text-left transition ${active ? "border-[#6655ea] ring-2 ring-[#6655ea]/20" : "border-[#e7e2eb] hover:border-[#b9afc5]"}`} key={creative.id}><div className="aspect-[9/16] bg-[#eeeaf2] bg-cover bg-center" style={imageUrl ? { backgroundImage: `url(${JSON.stringify(imageUrl).slice(1, -1)})` } : undefined} /><div className="p-4"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{creative.headline}</p><span className="rounded-full bg-[#eeeafd] px-2 py-1 text-[9px] font-bold uppercase text-[#5c4cf2]">{creative.status}</span></div><p className="mt-1 text-[10px] text-[#817989]">CTA: {creative.cta}{creative.parent_creative_id ? ` · Variant v${creative.version}` : ""}</p></div></button>; })}</div>
      {selected && <div className="mt-6 grid gap-5 rounded-2xl bg-[#f7f5fa] p-5 lg:grid-cols-2">
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#817989]">Edit the words</p><label className="mt-4 block text-xs font-semibold">Headline<input className="mt-1.5 w-full rounded-xl border border-[#ddd7e5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6655ea]" maxLength={90} value={headline} onChange={(event) => setHeadline(event.target.value)} /></label><label className="mt-3 block text-xs font-semibold">Call to action<input className="mt-1.5 w-full rounded-xl border border-[#ddd7e5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6655ea]" maxLength={36} value={cta} onChange={(event) => setCta(event.target.value)} /></label><button type="button" onClick={() => updateCreative({ headline, cta }, "edit")} disabled={!!busy || !headline.trim() || !cta.trim() || (headline === selected.headline && cta === selected.cta)} className="mt-4 rounded-xl bg-[#211b28] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{busy === "edit" ? "Applying changes…" : headline === selected.headline && cta === selected.cta ? "Copy is up to date" : "Apply copy changes"}</button><p className="mt-2 text-[10px] text-[#817989]">This updates the words on this saved creative without generating a new image.</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#817989]">Create a new version</p><label className="mt-4 block text-xs font-semibold">What should look different?<textarea className="mt-1.5 min-h-24 w-full resize-y rounded-xl border border-[#ddd7e5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#6655ea]" placeholder={`Example: Use a brighter scene and emphasize what makes ${campaign.products.title} distinctive.`} maxLength={500} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={regenerate} disabled={!!busy || feedback.trim().length < 3 || !headline.trim() || !cta.trim()} className="rounded-xl border border-[#6655ea] bg-white px-4 py-2.5 text-xs font-semibold text-[#5c4cf2] disabled:opacity-50">{busy === "regenerate" ? "Creating variant…" : "Generate new variant"}</button><button type="button" onClick={() => updateCreative({}, "approve")} disabled={!!busy || selected.status === "approved"} className="inline-flex items-center gap-2 rounded-xl bg-[#5c4cf2] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Check className="size-3.5" />{busy === "approve" ? "Approving…" : selected.status === "approved" ? "Approved" : "Approve this creative"}</button></div>{notice && <p className="mt-3 text-xs font-medium text-[#6655ea]">{notice}</p>}</div>
      </div>}
    </section>}
    {campaign.creatives.length > 0 && <div className="mt-5"><CampaignChat campaign={campaign} /></div>}
  </div></main>;
}
