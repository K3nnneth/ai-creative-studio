"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import { AppHeader } from "@/components/app-header";

type SavedCampaign = {
  id: string; name: string; status: string; angle: string; updated_at: string; creativeCount: number; imageUrl: string | null;
  products: { title: string; price_amount: number | null; currency: string };
  brands: { name: string };
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<SavedCampaign[]>();
  const [error, setError] = useState<string>();
  useEffect(() => { fetch("/api/campaigns").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setCampaigns(data.campaigns); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Campaigns could not be loaded.")); }, []);

  return <main className="min-h-screen bg-[#f3f0f7] text-[#1e1b24]"><AppHeader active="campaigns" /><div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">
    <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#817989]">Workspace</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">Existing campaigns</h1><p className="mt-3 text-sm text-[#756e7e]">Return to drafts, review generated concepts, and open approved work.</p></div>
    {!campaigns && !error && <div className="grid min-h-64 place-items-center"><LoaderCircle className="size-6 animate-spin text-[#5c4cf2]" /></div>}
    {error && <div className="mt-8 rounded-2xl bg-white p-5"><p className="text-sm text-[#a43c55]">{error}</p><button className="mt-3 rounded-xl bg-[#29252f] px-4 py-2 text-xs font-semibold text-white" onClick={() => window.location.reload()}>Try again</button></div>}
    {campaigns?.length === 0 && <div className="mt-8 rounded-[26px] border border-white bg-white/90 p-10 text-center"><h2 className="text-xl font-semibold">No campaigns yet</h2><p className="mt-2 text-sm text-[#817989]">Research a store and select a product to create the first campaign.</p><Link className="mt-5 inline-flex rounded-xl bg-[#5c4cf2] px-5 py-3 text-sm font-semibold text-white" href="/">Research a store</Link></div>}
    {campaigns && campaigns.length > 0 && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{campaigns.map((campaign) => <Link href={`/campaign?id=${campaign.id}`} key={campaign.id} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-white bg-white/90 shadow-[0_18px_50px_rgba(50,40,70,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(50,40,70,0.13)]"><div className="aspect-[16/10] bg-[#eae5ef] bg-cover bg-center" style={campaign.imageUrl ? { backgroundImage: `url(${JSON.stringify(campaign.imageUrl).slice(1, -1)})` } : undefined}>{!campaign.imageUrl && <div className="grid h-full place-items-center text-xs font-semibold text-[#938a9b]">No creative yet</div>}</div><div className="flex flex-1 flex-col p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[#eeeafd] px-2.5 py-1 text-[9px] font-bold uppercase text-[#5c4cf2]">{campaign.status}</span><span className="text-[10px] text-[#938a9b]">{campaign.creativeCount} {campaign.creativeCount === 1 ? "creative" : "creatives"}</span></div><h2 className="mt-4 text-lg font-semibold">{campaign.products.title}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#756e7e]">{campaign.angle}</p><div className="mt-auto flex items-center justify-between border-t border-[#eeeaf2] pt-4"><span className="text-[10px] font-semibold text-[#817989]">{campaign.brands.name}</span><ArrowRight className="size-4 text-[#6655ea] transition-transform group-hover:translate-x-1" /></div></div></Link>)}</div>}
  </div></main>;
}
