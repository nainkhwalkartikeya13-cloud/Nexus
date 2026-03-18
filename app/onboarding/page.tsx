"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, ArrowRight, Loader2, Sparkles, PlusCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { NexusLogo } from "@/components/shared/NexusLogo";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { update } = useSession();
    const isNew = searchParams.get("new") === "true";

    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            // 1. Create the new organization
            const response = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || "Failed to create organization");
            }

            const org = await response.json();

            // 2. Set as Active Organization in DB
            await fetch("/api/user/active-org", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: org.id }),
            });

            // 3. Update the frontend NextAuth session JWT
            await update({
                organizationId: org.id,
                role: "OWNER",
            });

            toast.success("Workspace created successfully! 🎉");

            // Allow session to propagate before redirecting
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 500);

        } catch (error: any) {
            console.error("Organization creation error:", error);
            toast.error(error.message || "Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-bg-base overflow-hidden selection:bg-accent/30 selection:text-white pb-[10vh]">

            {/* Ambient Lighting Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] opacity-50 mix-blend-screen opacity-motion" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[100px] opacity-30 mix-blend-screen" />
                <div className="fixed inset-0 pointer-events-none bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
                <div className="fixed inset-0 pointer-events-none bg-dot-grid opacity-[0.15]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-[440px] px-6"
            >
                {/* Logo Section */}
                <div className="flex justify-center mb-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.1,
                        }}
                        className="h-16 w-16 glass rounded-2xl flex items-center justify-center shadow-lg border border-white/10"
                    >
                        <NexusLogo className="w-8 h-8 text-accent" />
                    </motion.div>
                </div>

                <div className="glass-card rounded-[2rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl border-white/[0.08]">

                    {/* Shimmer line across top */}
                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

                    <div className="text-center mb-10">
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-black text-text-primary tracking-tight"
                        >
                            {isNew ? "Create Workspace" : "Welcome to Nexus"}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-sm font-medium text-text-muted mt-3 leading-relaxed"
                        >
                            {isNew
                                ? "Give your new organization a name to get started."
                                : "Let's set up your very first workspace so you can start conquering your goals."}
                        </motion.p>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="space-y-3"
                        >
                            <label className="text-[11px] font-black uppercase tracking-[0.15em] text-text-secondary flex items-center gap-1.5 ml-1">
                                <Sparkles className="w-3.5 h-3.5 text-accent" />
                                Workspace Name
                            </label>

                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <input
                                    type="text"
                                    disabled={isLoading}
                                    placeholder="e.g. Acme Corp, Design Agency..."
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={50}
                                    className={cn(
                                        "w-full h-14 pl-12 pr-4 bg-bg-surface/50 border border-border rounded-xl text-base font-medium text-text-primary placeholder:text-text-muted/50",
                                        "transition-all duration-200 outline-none backdrop-blur-md shadow-sm",
                                        "focus:bg-bg-surface focus:border-accent/40 focus:ring-4 focus:ring-accent/10 focus:shadow-glow",
                                        "disabled:opacity-50 disabled:cursor-not-allowed"
                                    )}
                                    autoFocus
                                    autoComplete="off"
                                />
                            </div>
                        </motion.div>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className={cn(
                                "w-full h-14 relative flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg overflow-hidden group transition-all duration-300",
                                !name.trim() || isLoading
                                    ? "bg-text-muted/50 cursor-not-allowed shadow-none"
                                    : "bg-gradient-to-r from-accent to-accent-light hover:shadow-primary hover:-translate-y-0.5"
                            )}
                        >
                            {/* Button Hover Glow */}
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <span className="relative z-10 flex items-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Setting up your workspace...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="w-5 h-5" />
                                        Create Workspace
                                        <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </span>
                        </motion.button>
                    </form>

                    {/* Footer text */}
                    {!isNew && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="mt-8 text-center text-[11px] font-medium text-text-muted"
                        >
                            You can invite members and configure billing later.
                        </motion.p>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
