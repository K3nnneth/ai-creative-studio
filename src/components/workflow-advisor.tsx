"use client";

import { FormEvent, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, LoaderCircle, MessageCircle, Sparkles, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";

type PageContext = "onboarding" | "review" | "campaign" | "campaigns";

function contextForPath(pathname: string): PageContext {
  if (pathname === "/review") return "review";
  if (pathname === "/campaign") return "campaign";
  if (pathname === "/campaigns") return "campaigns";
  return "onboarding";
}

const copy: Record<PageContext, { title: string; intro: string; placeholder: string; prompts: string[] }> = {
  onboarding: {
    title: "Plan your first campaign",
    intro: "I can explain the workflow, help choose a store, or clarify what the research will collect.",
    placeholder: "Ask about the process…",
    prompts: ["What will you research?", "Why do Shopify stores work best?"],
  },
  review: {
    title: "Review the brand interpretation",
    intro: "I can explain the evidence, challenge an assumption, or suggest clearer brand voice, audience, and value proposition wording.",
    placeholder: "Ask about this brand interpretation…",
    prompts: ["What evidence supports this audience?", "What would you revise in this brand kit?"],
  },
  campaign: {
    title: "Refine this campaign",
    intro: "I can evaluate the strategy, compare saved concepts, and suggest copy or a visual direction. Use the campaign controls to apply changes.",
    placeholder: "Ask about this campaign…",
    prompts: ["What do you think of the generated creatives?", "Suggest another visual direction"],
  },
  campaigns: {
    title: "Review your workspace",
    intro: "I can help you decide what to revisit, approve, or turn into the next campaign.",
    placeholder: "Ask about your campaigns…",
    prompts: ["What should I work on next?", "Explain the campaign statuses"],
  },
};

function AdvisorPart({ part }: { part: unknown }) {
  const item = part as { type?: string; text?: string; state?: string; output?: { creatives?: Array<{ headline: string; cta: string; status: string }> } };
  if (item.type === "text") return <MessageResponse>{item.text ?? ""}</MessageResponse>;
  if (item.type !== "tool-getCampaignCreatives") return null;
  if (item.state !== "output-available") return <div className="flex items-center gap-2 rounded-xl bg-[#f5f2fa] p-3 text-xs text-[#756e7e]"><LoaderCircle className="size-3.5 animate-spin" />Loading campaign context</div>;
  return <div className="rounded-2xl border border-[#e3ddec] bg-[#faf9fc] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#817989]">Saved concepts loaded</p><div className="mt-2 space-y-2">{item.output?.creatives?.map((creative, index) => <div className="rounded-xl bg-white p-2.5 shadow-sm" key={`${index}-${creative.headline}`}><p className="text-[9px] font-bold uppercase text-[#6655ea]">Concept {index + 1} · {creative.status}</p><p className="mt-1 text-xs font-semibold">{creative.headline}</p><p className="text-[10px] text-[#817989]">{creative.cta}</p></div>)}</div></div>;
}

function AdvisorConversation({ page, brandId, campaignId }: { page: PageContext; brandId?: string; campaignId?: string }) {
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { page, brandId, campaignId } }), [page, brandId, campaignId]);
  const { messages, sendMessage, regenerate, clearError, status, error } = useChat({
    transport,
    messages: [{ id: `welcome-${page}`, role: "assistant", parts: [{ type: "text", text: copy[page].intro }] }],
  });
  const waiting = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || waiting) return;
    sendMessage({ text });
    setInput("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
      {messages.map((message) => <Message from={message.role} key={message.id}><MessageContent>{message.parts.map((part, index) => <AdvisorPart part={part} key={index} />)}</MessageContent></Message>)}
      {messages.length === 1 && <div className="flex flex-wrap gap-2">{copy[page].prompts.map((prompt) => <button type="button" onClick={() => send(prompt)} className="rounded-full border border-[#ded8ea] bg-white px-3 py-2 text-left text-[11px] font-semibold text-[#5d5565] hover:border-[#8f82ec] hover:text-[#5c4cf2]" key={prompt}>{prompt}</button>)}</div>}
      {waiting && <div className="flex items-center gap-2 text-xs text-[#7b7383]"><LoaderCircle className="size-3.5 animate-spin" />Advisor is responding</div>}
      {error && <div className="rounded-xl bg-[#fff0f3] p-3"><p className="text-xs font-medium text-[#a43c55]">The advisor could not respond.</p><button type="button" className="mt-2 text-[11px] font-semibold underline" onClick={() => { clearError(); regenerate(); }}>Try again</button></div>}
    </div>
    <form className="m-4 flex gap-2 rounded-2xl border border-[#ddd7e5] bg-white p-2 shadow-sm" onSubmit={submit}><input className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder={copy[page].placeholder} value={input} onChange={(event) => setInput(event.target.value)} /><button className="grid size-10 place-items-center rounded-xl bg-[#5c4cf2] text-white disabled:opacity-40" disabled={!input.trim() || waiting} aria-label="Send message"><ArrowUp className="size-4" /></button></form>
  </div>;
}

export function WorkflowAdvisor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const page = contextForPath(pathname);
  const brandId = searchParams.get("brandId") ?? undefined;
  const campaignId = searchParams.get("id") ?? undefined;
  const contextKey = `${page}:${brandId ?? ""}:${campaignId ?? ""}`;

  return <>
    <button type="button" onClick={() => setOpen(true)} className={`fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#5c4cf2] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(67,51,190,0.35)] transition hover:-translate-y-0.5 hover:bg-[#5141e8] ${open ? "pointer-events-none opacity-0" : "opacity-100"}`} aria-label="Open Studio advisor"><Sparkles className="size-4" />Studio advisor</button>
    {open && <button type="button" className="fixed inset-0 z-40 bg-[#231d2f]/20 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none" onClick={() => setOpen(false)} aria-label="Close Studio advisor" />}
    <aside className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[#e5dfeb] bg-[#fbfafe] shadow-[-20px_0_60px_rgba(42,34,53,0.16)] transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`} aria-hidden={!open}>
      <div className="flex items-start justify-between gap-4 border-b border-[#e8e3ed] bg-white/80 px-5 py-5"><div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6655ea]"><MessageCircle className="size-3.5" />Studio advisor</div><h2 className="mt-1 text-lg font-semibold tracking-[-0.02em]">{copy[page].title}</h2><p className="mt-1 text-[11px] leading-5 text-[#817989]">Context updates as you move through the workflow.</p></div><button type="button" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f1eef5] text-[#655e6d] hover:bg-[#e8e3ed]" aria-label="Close Studio advisor"><X className="size-4" /></button></div>
      <AdvisorConversation page={page} brandId={brandId} campaignId={campaignId} key={contextKey} />
    </aside>
  </>;
}
