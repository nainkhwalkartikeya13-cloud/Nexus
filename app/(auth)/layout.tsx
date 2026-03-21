import { Suspense } from "react";
import { CheckCircle2, Star, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NexusLogo } from "@/components/shared/NexusLogo";
import { motion } from "framer-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-base relative overflow-hidden selection:bg-accent/30 selection:text-white">
      {/* ── AMBIENT BACKGROUND (Matching Onboarding/Landing) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[140px] opacity-40 mix-blend-multiply" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] opacity-20 mix-blend-multiply" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] opacity-20 mix-blend-multiply" />
        <div className="fixed inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay" />
        <div className="fixed inset-0 bg-dot-grid opacity-[0.2]" />
      </div>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-[55%] flex-col relative px-16 py-12 z-10 border-r border-border-default bg-surface/30 backdrop-blur-3xl">
        <div className="flex items-center gap-2.5 mb-20">
          <NexusLogo className="h-9 w-9 text-accent shadow-sm" />
          <span className="font-display text-2xl font-black tracking-tighter text-text-primary uppercase">
            Nexus
          </span>
        </div>

        {/* Middle: Content */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-light border border-accent/10 text-xs font-bold text-accent-text mb-6 shadow-sm w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            Your team's command center
          </div>

          <h1 className="text-5xl lg:text-7xl font-display font-black leading-[1.05] mb-8 text-text-primary tracking-tighter">
            Unify your workflow,<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent via-purple-500 to-rose-500">
              at the Nexus.
            </span>
          </h1>

          <div className="space-y-5 mb-16">
            {[
              "Unified hub for tasks, docs & chats",
              "Enterprise-grade security & permissions",
              "Automated workflows & time tracking",
              "Intelligent analytics & team insights"
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-text-secondary text-base font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Testimonial */}
        <div className="glass-card p-6 rounded-2xl max-w-lg shadow-[0_8px_32px_rgba(0,0,0,0.04)] ring-1 ring-border/50">
          <div className="flex gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400 shadow-sm" />
            ))}
          </div>
          <p className="italic text-text-primary text-lg font-medium mb-6 leading-relaxed">
            &quot;Nexus brought our entire workflow under one roof — tasks, docs, invoices, and time tracking. Our team finally stopped context-switching and started shipping.&quot;
          </p>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
              <AvatarImage src="https://i.pravatar.cc/150?u=sarah" />
              <AvatarFallback className="bg-accent text-white font-bold">SW</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-black text-text-primary text-sm tracking-tight">Sarah Williams</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-0.5">Vanguard Systems</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (Auth Focus) ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10 bg-transparent flex-shrink-0">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <NexusLogo className="h-8 w-8 text-accent shadow-sm" />
          <span className="font-display text-2xl font-black text-text-primary">
            Nexus
          </span>
        </div>

        <main className="w-full max-w-[420px] flex flex-col gap-6 perspective-[1000px]">
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
