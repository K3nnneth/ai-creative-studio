import { Sparkles } from "lucide-react";
import Link from "next/link";

export function AppHeader({ active }: { active: "new" | "catalog" | "campaigns" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-white/65 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-8 place-items-center rounded-[10px] bg-[#5c4cf2] text-white shadow-[0_8px_24px_rgba(92,76,242,0.28)]"><Sparkles className="size-4" strokeWidth={2.4} /></span>
          <span className="hidden text-sm font-bold tracking-[-0.02em] sm:inline">AI Creative Studio</span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-white/80 bg-white/70 p-1 shadow-sm" aria-label="Primary navigation">
          <Link className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${active === "new" ? "bg-[#eee9ff] text-[#5c4cf2]" : "text-[#6f6878] hover:bg-white hover:text-[#342f3a]"}`} href="/"><span className="hidden sm:inline">New </span>campaign</Link>
          <Link className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${active === "catalog" ? "bg-[#eee9ff] text-[#5c4cf2]" : "text-[#6f6878] hover:bg-white hover:text-[#342f3a]"}`} href="/review"><span className="hidden sm:inline">Product </span>catalog</Link>
          <Link className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${active === "campaigns" ? "bg-[#eee9ff] text-[#5c4cf2]" : "text-[#6f6878] hover:bg-white hover:text-[#342f3a]"}`} href="/campaigns"><span className="hidden sm:inline">Existing </span>campaigns</Link>
        </nav>
      </div>
    </header>
  );
}
