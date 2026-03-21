"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
    ArrowRight,
    CheckCircle2,
    Zap,
    Shield,
    Users,
    BarChart3,
    Layers,
    FolderKanban,
    Star,
    Globe,
    Layout,
} from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export function LandingContent() {
    return (
        <div className="min-h-screen bg-bg-base text-text-primary selection:bg-accent/20 selection:text-accent-text overflow-x-hidden">
            <Navbar />
            <Hero />
            <SocialProof />
            <Features />
            <HowItWorks />
            <Testimonials />
            <Pricing />
            <CTA />
            <Footer />
        </div>
    );
}

function Navbar() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav className={cn(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
            scrolled
                ? "bg-surface/80 backdrop-blur-md border-border-default py-3 shadow-sm"
                : "bg-transparent border-transparent py-5"
        )}>
            <div className="container mx-auto px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                        <Zap className="h-5 w-5 text-white fill-white" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-text-primary">
                        Nexus
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    {["Features", "How it works", "Testimonials", "Pricing"].map((item) => (
                        <Link
                            key={item}
                            href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                            className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                            {item}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Link href="/login">
                        <Button variant="ghost" size="sm">Sign In</Button>
                    </Link>
                    <Link href="/register">
                        <Button size="sm">Get Started</Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

function Hero() {
    return (
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
            {/* Background Blobs - Subtle Light Mode */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full -z-10" />

            <div className="container mx-auto px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light border border-accent/10 text-xs font-bold text-accent-text mb-8 shadow-sm">
                        <span className="flex h-2 w-2 rounded-full bg-accent animate-pulse" />
                        New: Advanced Kanban & Docs support
                        <ArrowRight className="h-3 w-3" />
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] text-text-primary"
                >
                    Ship your SaaS <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent to-blue-500">
                        faster than ever.
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed font-medium"
                >
                    The ultimate foundation for your next big idea.
                    Multi-tenant, Razorpay-ready, and beautifully designed directly out of the box.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
                >
                    <Link href="/register" className="w-full sm:w-auto">
                        <Button size="lg" icon={<ArrowRight className="h-5 w-5" />} className="w-full sm:w-auto px-10 shadow-xl shadow-accent/20 transition-all hover:scale-105 active:scale-95">
                            Start Building Free
                        </Button>
                    </Link>
                    <Link href="#features" className="w-full sm:w-auto">
                        <Button variant="secondary" size="lg" className="w-full sm:w-auto px-10 font-bold border-border-default">
                            Live Demo
                        </Button>
                    </Link>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="relative max-w-6xl mx-auto"
                >
                    {/* Dashboard Mockup - Refreshed for Light Theme */}
                    <div className="relative rounded-2xl border border-border-default bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden group">
                        {/* Browser Header */}
                        <div className="h-10 bg-bg-hover/50 border-b border-border-default flex items-center px-4 gap-2">
                            <div className="flex gap-1.5">
                                <div className="h-3 w-3 rounded-full bg-red-400" />
                                <div className="h-3 w-3 rounded-full bg-amber-400" />
                                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                            </div>
                            <div className="mx-auto bg-surface rounded-md px-4 py-1 flex items-center gap-2 border border-border-default shadow-sm">
                                <Globe className="h-3 w-3 text-text-muted" />
                                <span className="text-[10px] text-text-secondary font-bold">app.nexus.com/dashboard</span>
                            </div>
                        </div>

                        {/* Mini Dashboard Content */}
                        <div className="aspect-[16/10] flex bg-bg-base">
                            {/* Sidebar */}
                            <div className="w-48 border-r border-border-default p-4 flex flex-col gap-6 bg-surface">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-6 w-6 rounded bg-accent shadow-sm" />
                                    <div className="h-2 w-16 bg-bg-hover rounded" />
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <div key={i} className="h-2 w-full bg-bg-hover rounded" />
                                    ))}
                                </div>
                            </div>
                            {/* Main Content */}
                            <div className="flex-1 p-8 space-y-8 overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <div className="h-4 w-32 bg-bg-hover rounded" />
                                    <div className="h-8 w-24 bg-accent shadow-sm rounded-lg" />
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-surface rounded-2xl border border-border-default shadow-sm" />
                                    ))}
                                </div>
                                <div className="h-64 bg-surface rounded-2xl border border-border-default p-6 shadow-sm">
                                    <div className="flex gap-2">
                                        <div className="h-4 w-4 bg-accent/20 rounded shadow-sm" />
                                        <div className="h-2 w-24 bg-bg-hover rounded" />
                                    </div>
                                    <div className="mt-6 space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-2 w-full bg-bg-hover rounded" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Float Animation Overlay */}
                        <motion.div
                            animate={{
                                y: [0, -15, 0],
                            }}
                            transition={{
                                duration: 5,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4/5 h-4/5 pointer-events-none"
                        >
                            <div className="absolute top-10 right-10 p-5 bg-bg-surface rounded-2xl shadow-2xl ring-1 ring-border transform rotate-3 scale-110">
                                <Users className="h-6 w-6 text-accent" />
                            </div>
                            <div className="absolute bottom-20 left-10 p-5 bg-bg-surface rounded-2xl shadow-2xl ring-1 ring-border transform -rotate-6 scale-110">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Glow effect under mockup */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-accent/10 blur-[60px] -z-10" />
                </motion.div>
            </div>
        </section>
    );
}

const PARTNERS = [
    { name: "Next.js", color: "#000" },
    { name: "TypeScript", color: "#3178c6" },
    { name: "PostgreSQL", color: "#336791" },
    { name: "Razorpay", color: "#0f3ad1" },
    { name: "Prisma", color: "#2d3748" },
    { name: "Framer Motion", color: "#ff0055" }
];

function SocialProof() {
    return (
        <div className="py-20 border-y border-border-default bg-surface">
            <div className="container mx-auto px-6 text-center">
                <p className="text-xs font-black text-text-muted mb-12 uppercase tracking-[0.3em]">Built with world-class technologies</p>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
                    {PARTNERS.map((p) => (
                        <div key={p.name} className="flex items-center gap-3 group cursor-default">
                            <div
                                className="h-2 w-2 rounded-full shadow-sm"
                                style={{ backgroundColor: p.color }}
                            />
                            <span className="text-xl font-black text-text-secondary group-hover:text-text-primary transition-colors">{p.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const FEATURES = [
    {
        title: "Multi-tenant Architecture",
        description: "Built-in organization management out of the box. Separate your users data with ease.",
        icon: Layers,
        color: "bg-indigo-500",
        text: "text-indigo-500"
    },
    {
        title: "Advanced Kanban Board",
        description: "Spreadsheet-like tables, Kanban boards, and bulk actions for heavy-duty productivity.",
        icon: FolderKanban,
        color: "bg-purple-500",
        text: "text-purple-500"
    },
    {
        title: "Razorpay Global Billing",
        description: "Subscription plans, checkout redirects, and customer portal management ready for production.",
        icon: Zap,
        color: "bg-amber-500",
        text: "text-amber-500"
    },
    {
        title: "Role-Based Permissions",
        description: "Fine-grained permissions for owners, admins, and members to keep your workspace secure.",
        icon: Shield,
        color: "bg-emerald-500",
        text: "text-emerald-500"
    },
    {
        title: "Real-time Analytics",
        description: "Beautiful charts and metrics to track your progress and team productivity effortlessly.",
        icon: BarChart3,
        color: "bg-pink-500",
        text: "text-pink-500"
    },
    {
        title: "Premium Component UI",
        description: "Animations, glassmorphism, and pixel-perfect UI components that wow your users.",
        icon: Layout,
        color: "bg-sky-500",
        text: "text-sky-500"
    }
];

function Features() {
    return (
        <section id="features" className="py-32 relative bg-bg-base">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-light border border-accent/10 text-[10px] font-black text-accent-text mb-4 uppercase tracking-widest">Powerful Features</div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mt-4 mb-8 text-text-primary heading">Everything you need <br /> to scale your SaaS.</h2>
                    <p className="text-text-secondary text-lg font-medium leading-relaxed">We&apos;ve handled the boring stuff. Focus on building your core product features while we take care of the rest.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {FEATURES.map((feature, idx) => (
                        <FeatureCard key={feature.title} feature={feature} index={idx} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ feature, index }: { feature: (typeof FEATURES)[0], index: number }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
        >
            <Card className="p-8 h-full group hover:border-accent/40 shadow-sm hover:shadow-xl transition-all duration-500">
                <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm",
                    feature.color, "bg-opacity-10", feature.text
                )}>
                    <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-extrabold mb-4 group-hover:text-accent transition-colors text-text-primary">{feature.title}</h3>
                <p className="text-text-secondary font-medium leading-relaxed">{feature.description}</p>
            </Card>
        </motion.div>
    );
}

function HowItWorks() {
    const steps = [
        { title: "Create Workspace", desc: "Set up your organization in seconds and invite your core team members." },
        { title: "Organize Projects", desc: "Build projects, manage tasks with Kanban boards, and set clear priorities." },
        { title: "Scale Progress", desc: "Track progress with analytics, handle billing, and scale your operations globally." }
    ];

    return (
        <section id="how-it-works" className="py-32 bg-surface border-y border-border-default">
            <div className="container mx-auto px-6">
                <div className="text-center mb-24 max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-black mb-6 text-text-primary heading tracking-tight">The path to productivity.</h2>
                    <p className="text-text-secondary font-medium text-lg">Three simple steps to transition your team to Nexus.</p>
                </div>

                <div className="relative">
                    {/* Connector Line */}
                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-bg-hover -translate-y-1/2 hidden lg:block" />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 relative z-10">
                        {steps.map((step, i) => (
                            <div key={step.title} className="text-center group">
                                <div className="h-20 w-20 rounded-[2rem] bg-accent flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-accent/40 relative transform group-hover:scale-110 transition-transform duration-500">
                                    <span className="text-2xl font-black text-white italic">{i + 1}</span>
                                    <div className="absolute inset-0 rounded-[2rem] bg-accent animate-ping opacity-10" />
                                </div>
                                <h4 className="text-2xl font-black mb-4 text-text-primary">{step.title}</h4>
                                <p className="text-text-secondary font-medium leading-relaxed px-6">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

const TESTIMONIALS = [
    {
        quote: "Nexus saved us months of development time. The billing and multi-tenancy are rock solid.",
        author: "Sarah Chen",
        role: "CTO @ Velocity",
        avatar: "https://i.pravatar.cc/150?u=sarah"
    },
    {
        quote: "The cleanest dashboard I've ever used. My team actually enjoys updating their tasks now.",
        author: "James Wilson",
        role: "Product Lead @ Nexa",
        avatar: "https://i.pravatar.cc/150?u=james"
    },
    {
        quote: "Scale with confidence. We went from 5 to 500 members without a single hitch in performance.",
        author: "Elena Rodriguez",
        role: "Founder @ ScaleX",
        avatar: "https://i.pravatar.cc/150?u=elena"
    }
];

function Testimonials() {
    return (
        <section id="testimonials" className="py-32 bg-bg-base">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {TESTIMONIALS.map((t) => (
                        <Card key={t.author} className="p-8 hover:translate-y-[-12px] shadow-sm hover:shadow-2xl transition-all duration-500">
                            <div className="flex gap-1 mb-8">
                                {[1, 2, 3, 4, 5].map(i => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400 shadow-sm" />)}
                            </div>
                            <p className="text-xl font-medium italic text-text-primary mb-10 leading-relaxed">&quot;{t.quote}&quot;</p>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full border-2 border-accent-light overflow-hidden shadow-sm">
                                    <img src={t.avatar} alt={t.author} className="h-full w-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-black text-text-primary">{t.author}</p>
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{t.role}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Pricing() {
    return (
        <section id="pricing" className="py-32 bg-accent-light relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            <div className="container mx-auto px-6 text-center">
                <div className="max-w-3xl mx-auto mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-surface border border-accent/10 text-[10px] font-black text-accent mb-4 uppercase tracking-widest shadow-sm">Simple Pricing</div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-text-primary heading">Pricing for every stage.</h2>
                    <p className="text-text-secondary font-medium text-lg leading-relaxed">Start free and scale as you grow. No hidden fees, no complexity.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    <PricingCard plan="Free" price="$0" features={["2 Members", "3 Projects", "Basic Tasks", "Rich Text Editor"]} />
                    <PricingCard plan="Pro" price="$29" features={["25 Members", "Unlimited Projects", "Analytics", "Bulk Actions", "Razorpay Support"]} highlighted />
                    <PricingCard plan="Enterprise" price="Custom" features={["Unlimited Members", "Dedicated Support", "SLA & Security", "Custom Branding"]} />
                </div>
            </div>
        </section>
    );
}

function PricingCard({ plan, price, features, highlighted = false }: { plan: string, price: string, features: string[], highlighted?: boolean }) {
    return (
        <Card className={cn(
            "p-10 relative bg-surface transition-all duration-500",
            highlighted ? "border-accent ring-4 ring-accent/5 scale-105 shadow-2xl z-10" : "border-border-default shadow-sm hover:shadow-xl"
        )}>
            {highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-accent text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-xl shadow-accent/30">
                    Most Popular
                </div>
            )}
            <p className="text-sm font-black uppercase tracking-[0.2em] text-text-muted mb-4">{plan}</p>
            <div className="flex items-baseline justify-center gap-2 mb-8">
                <span className="text-5xl font-black text-text-primary tracking-tight">{price}</span>
                {price !== "Custom" && <span className="text-text-muted font-bold">/mo</span>}
            </div>
            <div className="space-y-4 mb-10 text-left">
                {features.map(f => (
                    <div key={f} className="flex items-center gap-3 text-sm font-semibold text-text-secondary">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        {f}
                    </div>
                ))}
            </div>
            <Link href="/register">
                <Button fullWidth variant={highlighted ? "primary" : "secondary"} size="lg" className="rounded-xl font-black py-6">
                    Get Started
                </Button>
            </Link>
        </Card>
    );
}

function CTA() {
    return (
        <section className="py-32 bg-bg-base">
            <div className="container mx-auto px-6">
                <div className="relative rounded-[3rem] bg-[#020617] overflow-hidden p-16 md:p-24 text-center shadow-2xl border border-white/5">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.15),_transparent_70%)]" />
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-[0.03] pointer-events-none" />
                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white mb-12 leading-tight tracking-tight">Ready to transform Your entire workflow?</h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link href="/register" className="w-full sm:w-auto">
                                <Button size="lg" className="bg-bg-surface text-text-primary hover:bg-bg-surface/90 border-0 w-full sm:w-auto px-12 py-7 rounded-2xl font-black shadow-2xl">
                                    Join Nexus Today
                                </Button>
                            </Link>
                            <Link href="/login" className="w-full sm:w-auto">
                                <Button size="lg" variant="ghost" className="text-white hover:bg-bg-surface/10 w-full sm:w-auto px-10 py-7 font-black">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Footer() {
    return (
        <footer className="py-24 border-t border-border-default bg-surface">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-24">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                                <Zap className="h-5 w-5 text-white fill-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-text-primary">Nexus</span>
                        </Link>
                        <p className="text-text-secondary font-medium text-base max-w-xs leading-relaxed">
                            The ultimate SaaS foundation for companies who value speed, design, and developer experience.
                        </p>
                    </div>
                    <div>
                        <h5 className="font-black mb-8 text-xs uppercase tracking-[0.3em] text-text-primary">Product</h5>
                        <div className="flex flex-col gap-5">
                            {["Features", "Integrations", "Pricing", "Changelog"].map(l => (
                                <Link key={l} href="#" className="text-sm font-bold text-text-muted hover:text-text-primary transition-colors">{l}</Link>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h5 className="font-black mb-8 text-xs uppercase tracking-[0.3em] text-text-primary">Connect</h5>
                        <div className="flex flex-col gap-5">
                            {["Twitter", "GitHub", "Discord", "Docs"].map(l => (
                                <Link key={l} href="#" className="text-sm font-bold text-text-muted hover:text-text-primary transition-colors">{l}</Link>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-center gap-10 text-text-muted text-xs font-bold uppercase tracking-widest border-t border-border-default pt-12">
                    <p>© 2026 Nexus Core. All rights reserved.</p>
                    <div className="flex items-center gap-10">
                        <Link href="#" className="hover:text-text-primary transition-colors">Terms of Service</Link>
                        <Link href="#" className="hover:text-white bg-text-primary text-white px-4 py-2 rounded-lg transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
