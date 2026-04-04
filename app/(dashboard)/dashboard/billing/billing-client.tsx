"use client";

import { useState, useEffect } from "react";
import {
    Zap, Check, Shield, Users, FolderKanban,
    CreditCard, Download,
    Loader2, CheckCircle2, Info, Crown, AlertCircle, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { cn } from "@/lib/utils";
import { SubscriptionPlan } from "@prisma/client";

export interface Invoice {
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    pdfUrl: string | null;
}

interface Props {
    plan: SubscriptionPlan;
    usage: {
        members: number;
        projects: number;
        aiRequests: number;
    };
    limits: {
        members: number;
        projects: number;
        aiRequests: number;
    };
    invoices: Invoice[];
    isOwner: boolean;
    role?: string;
    isAdminOrOwner: boolean;
    razorpayConfigured: boolean;
}

const PRICING_PLANS = [
    {
        plan: "STARTER" as SubscriptionPlan,
        name: "Starter",
        price: 749,
        currency: "₹",
        description: "Perfect for small teams getting started.",
        features: [
            "Up to 5 team members",
            "Up to 10 projects",
            "Priority support",
            "Project templates",
            "Basic analytics"
        ],
        popular: false,
    },
    {
        plan: "PRO" as SubscriptionPlan,
        name: "Pro",
        price: 2399,
        currency: "₹",
        description: "Power tools for scaling organizations.",
        features: [
            "Up to 25 team members",
            "Unlimited projects",
            "Advanced permissions",
            "Custom branding",
            "Priority 24/7 support",
            "Advanced analytics",
            "API access"
        ],
        popular: true,
    },
    {
        plan: "ENTERPRISE" as SubscriptionPlan,
        name: "Enterprise",
        price: null,
        currency: "₹",
        description: "Full control for large-scale operations.",
        features: [
            "Unlimited team members",
            "Unlimited projects",
            "Dedicated account manager",
            "SSO & SAML authentication",
            "Advanced audit logs",
            "Custom contract & invoicing"
        ],
        popular: false,
    }
];

// Load Razorpay script dynamically
function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === "undefined") return resolve(false);
        if ((window as unknown as Record<string, unknown>)["Razorpay"]) return resolve(true);

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export function BillingClient({ plan, usage, limits, invoices, isOwner, role, isAdminOrOwner, razorpayConfigured }: Props) {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState<string | null>(null);
    const [cancelConfirm, setCancelConfirm] = useState(false);

    const success = searchParams.get("success");

    useEffect(() => {
        // Preload Razorpay script
        loadRazorpayScript();
    }, []);

    const handleCheckout = async (targetPlan: SubscriptionPlan) => {
        if (!isAdminOrOwner) {
            toast.error("Only workspace owners and admins can manage billing.");
            return;
        }
        if (!razorpayConfigured) {
            toast.error("Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file.");
            return;
        }
        if (targetPlan === "ENTERPRISE") {
            window.location.href = "mailto:support@nexus.app?subject=Enterprise%20Plan%20Inquiry";
            return;
        }

        setLoading(targetPlan);
        try {
            // Step 1: Create Razorpay subscription on server
            const res = await fetch("/api/billing/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: targetPlan })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Could not start checkout process");
            }

            // Step 2: Load Razorpay script
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                throw new Error("Could not load Razorpay SDK. Check your internet connection.");
            }

            // Step 3: Open Razorpay checkout popup
            const RazorpayCheckout = (window as unknown as Record<string, unknown>)["Razorpay"] as new (options: unknown) => { open(): void };
            const rzp = new RazorpayCheckout({
                key: data.key,
                subscription_id: data.subscriptionId,
                name: "Nexus",
                description: `${targetPlan} Plan Subscription`,
                image: "/favicon.ico",
                prefill: data.prefill,
                notes: {
                    organizationId: data.organizationId,
                    plan: data.plan,
                },
                theme: { color: "#6366f1" },
                handler: async () => {
                    toast.success("Payment successful! Activating your plan...");
                    try {
                        await fetch("/api/billing/confirm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ subscriptionId: data.subscriptionId, plan: data.plan }),
                        });
                    } catch {
                        // Webhook will handle it as fallback
                    }
                    setTimeout(() => window.location.reload(), 1500);
                },
                modal: {
                    ondismiss: () => {
                        toast("Checkout cancelled.");
                        setLoading(null);
                    }
                }
            });
            rzp.open();
        } catch (error) {
            toast.error((error as Error).message || "Could not start checkout process");
            setLoading(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!cancelConfirm) {
            setCancelConfirm(true);
            return;
        }
        setLoading("cancel");
        setCancelConfirm(false);
        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Could not cancel subscription");
            }
            toast.success("Subscription cancelled. You have been downgraded to the FREE plan.");
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error((error as Error).message || "Could not cancel subscription");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <PageHeader heading="Billing & Plans" description="Manage your subscription and organization limits">
                <Badge className="bg-bg-hover border-border text-text-muted">Current Plan: {plan}</Badge>
            </PageHeader>

            {/* ── RAZORPAY NOT CONFIGURED BANNER ── */}
            {!razorpayConfigured && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <Zap className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-300">Razorpay is not configured</p>
                        <p className="text-xs text-amber-400/80 mt-1">
                            Billing features are disabled. Add{" "}
                            <code className="bg-bg-surface px-1 py-0.5 rounded font-mono text-[11px]">RAZORPAY_KEY_ID</code> and{" "}
                            <code className="bg-bg-surface px-1 py-0.5 rounded font-mono text-[11px]">RAZORPAY_KEY_SECRET</code> to your{" "}
                            <code className="bg-bg-surface px-1 py-0.5 rounded font-mono text-[11px]">.env</code> file and restart the server.
                        </p>
                    </div>
                </div>
            )}

            {/* ── SUCCESS ALERT ── */}
            {success === "true" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-text-primary">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-text-primary tracking-wide">Subscription Updated Successfully</p>
                            <p className="text-xs text-emerald-400/80">Your new features are now active. Thank you for upgrading!</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── RESTRICTED VIEW NOTICE FOR MEMBERS ── */}
            {!isAdminOrOwner && (
                <div className="flex items-center gap-3 p-4 bg-bg-hover border border-border rounded-xl mb-6">
                    <Info className="h-5 w-5 text-accent shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-text-primary">Restricted View</p>
                        <p className="text-xs text-text-muted mt-0.5">
                            You are viewing the workspace billing page as a member. Only administrators can manage subscriptions and view full billing details.
                        </p>
                    </div>
                </div>
            )}

            {/* ── CURRENT PLAN & USAGE (Admin Only) ── */}
            {isAdminOrOwner && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 p-6 border-border/50 flex flex-col justify-between overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <Crown className="h-32 w-32" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1">Active Plan</p>
                            <h3 className="text-2xl font-display font-bold text-text-primary mb-4">{plan}</h3>

                            <div className="space-y-4 mb-8">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-text-muted flex items-center gap-1.5"><Users className="h-3 w-3" /> Members</span>
                                        <span className="text-text-primary font-bold">{usage.members} / {limits.members === 9999 ? "∞" : limits.members}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-bg-hover rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((usage.members / (limits.members || 1)) * 100, 100)}%` }}
                                            className="h-full bg-accent"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-text-muted flex items-center gap-1.5"><FolderKanban className="h-3 w-3" /> Projects</span>
                                        <span className="text-text-primary font-bold">{usage.projects} / {limits.projects === 9999 ? "∞" : limits.projects}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-bg-hover rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((usage.projects / (limits.projects || 1)) * 100, 100)}%` }}
                                            className="h-full bg-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-text-muted flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-[#a78bfa]" /> AI Requests</span>
                                        <span className="text-text-primary font-bold">{usage.aiRequests} / {limits.aiRequests === 9999 ? "∞" : limits.aiRequests}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-bg-hover rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((usage.aiRequests / (limits.aiRequests || 1)) * 100, 100)}%` }}
                                            className="h-full"
                                            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {plan !== "FREE" && isAdminOrOwner && (
                            <div className="space-y-2">
                                {cancelConfirm ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                                            <p className="text-xs text-red-300">This will cancel your subscription immediately and downgrade to FREE.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => setCancelConfirm(false)} variant="secondary" className="flex-1 h-10 text-xs">
                                                Keep Plan
                                            </Button>
                                            <Button onClick={handleCancelSubscription} disabled={loading === "cancel"} className="flex-1 h-10 text-xs bg-red-600 hover:bg-red-700 border-0">
                                                {loading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Confirm Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button onClick={handleCancelSubscription} disabled={loading !== null} variant="secondary" className="w-full border-border/50 h-10">
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Cancel Subscription
                                    </Button>
                                )}
                            </div>
                        )}
                    </Card>

                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {PRICING_PLANS.map((p) => {
                            const isCurrent = plan === p.plan;
                            return (
                                <Card key={p.plan} className={cn(
                                    "p-6 border-border/50 transition-all group overflow-hidden relative",
                                    isCurrent ? "ring-2 ring-accent border-transparent" : "hover:border-border"
                                )}>
                                    {p.popular && !isCurrent && (
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-accent text-text-primary text-[9px] font-bold tracking-widest uppercase py-1 px-4 transform rotate-45 translate-x-3 translate-y-1 shadow-lg">
                                                Popular
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <h4 className="text-lg font-bold text-text-primary mb-1">{p.name}</h4>
                                        <p className="text-xs text-text-muted leading-relaxed">{p.description}</p>
                                    </div>

                                    <div className="mb-6 flex items-baseline gap-1">
                                        {p.price !== null ? (
                                            <>
                                                <span className="text-2xl font-display font-bold text-text-primary">{p.currency}{p.price}</span>
                                                <span className="text-xs text-text-muted">/ month</span>
                                            </>
                                        ) : (
                                            <span className="text-xl font-display font-bold text-text-primary">Custom</span>
                                        )}
                                    </div>

                                    <ul className="space-y-2 mb-6">
                                        {p.features.map(f => (
                                            <li key={f} className="flex items-start gap-2 text-xs text-text-muted">
                                                <div className="h-4 w-4 rounded-full bg-bg-hover flex items-center justify-center mt-0.5 group-hover:bg-accent/20 transition-colors">
                                                    <Check className="h-2.5 w-2.5 text-accent" />
                                                </div>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <Button
                                        disabled={isCurrent || loading !== null}
                                        onClick={() => handleCheckout(p.plan)}
                                        variant={isCurrent ? "secondary" : "primary"}
                                        className={cn(
                                            "w-full h-10 text-xs",
                                            (isCurrent || !isAdminOrOwner) ? "opacity-50 cursor-default bg-bg-hover border-border" : ""
                                        )}
                                    >
                                        {loading === p.plan
                                            ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            : isCurrent
                                                ? <Check className="h-4 w-4 mr-2" />
                                                : !isAdminOrOwner
                                                    ? <Shield className="h-4 w-4 mr-2" />
                                                    : <Zap className="h-4 w-4 mr-2" />
                                        }
                                        {isCurrent ? "Current Plan" : !isAdminOrOwner ? "Admin Only" : p.plan === "ENTERPRISE" ? "Contact Sales" : "Upgrade Plan"}
                                    </Button>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {!isAdminOrOwner && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PRICING_PLANS.map((p) => {
                        const isCurrent = plan === p.plan;
                        return (
                            <Card key={p.plan} className={cn(
                                "p-6 border-border/50 transition-all group overflow-hidden relative",
                                isCurrent ? "ring-2 ring-accent border-transparent" : "hover:border-border"
                            )}>
                                <div className="mb-4">
                                    <h4 className="text-lg font-bold text-text-primary mb-1">{p.name}</h4>
                                    <p className="text-xs text-text-muted leading-relaxed">{p.description}</p>
                                </div>
                                <div className="mb-6 flex items-baseline gap-1">
                                    {p.price !== null ? (
                                        <>
                                            <span className="text-2xl font-display font-bold text-text-primary">{p.currency}{p.price}</span>
                                            <span className="text-xs text-text-muted">/ month</span>
                                        </>
                                    ) : (
                                        <span className="text-xl font-display font-bold text-text-primary">Custom</span>
                                    )}
                                </div>
                                <Button
                                    disabled
                                    variant={isCurrent ? "secondary" : "primary"}
                                    className="w-full h-10 text-xs opacity-50 cursor-default bg-bg-hover border-border"
                                >
                                    {isCurrent ? <Check className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                    {isCurrent ? "Current Plan" : "Admin Only"}
                                </Button>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── BILLING HISTORY (Admin Only) ── */}
            {isAdminOrOwner && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Billing History</h3>
                        <Badge className="bg-bg-hover border-border text-text-muted">{invoices.length}</Badge>
                    </div>

                    <Card className="border-border/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-bg-hover border-b border-border/50">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-text-muted uppercase tracking-wider text-[10px]">Date</th>
                                        <th className="px-6 py-4 font-semibold text-text-muted uppercase tracking-wider text-[10px]">Amount</th>
                                        <th className="px-6 py-4 font-semibold text-text-muted uppercase tracking-wider text-[10px]">Status</th>
                                        <th className="px-6 py-4 font-semibold text-text-muted uppercase tracking-wider text-[10px] text-right">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-text-muted opacity-40 italic">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Info className="h-8 w-8" />
                                                    No payment history found
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-bg-hover transition-colors group">
                                                <td className="px-6 py-4 text-text-primary font-medium">{format(new Date(inv.date), "MMM d, yyyy")}</td>
                                                <td className="px-6 py-4 text-text-primary font-bold">₹{(inv.amount).toFixed(2)} <span className="text-[10px] font-medium text-text-muted uppercase">{inv.currency}</span></td>
                                                <td className="px-6 py-4">
                                                    <Badge className={cn(
                                                        "uppercase text-[9px] font-bold tracking-widest",
                                                        inv.status === "paid" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                    )}>
                                                        {inv.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {inv.pdfUrl && (
                                                        <a
                                                            href={inv.pdfUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-bg-hover border border-border/50 text-text-muted hover:text-text-primary hover:bg-bg-surface transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex items-center gap-3 p-4 bg-bg-hover border border-border rounded-xl mt-8">
                <Shield className="h-6 w-6 text-accent" />
                <p className="text-[10px] text-text-muted leading-relaxed max-w-2xl uppercase tracking-wider font-medium">
                    Payments are securely handled by <strong className="text-text-primary">Razorpay</strong>.
                    We do not store your full card details on our servers.
                    All subscriptions can be cancelled at any time from this page.
                </p>
            </div>
        </div>
    );
}
