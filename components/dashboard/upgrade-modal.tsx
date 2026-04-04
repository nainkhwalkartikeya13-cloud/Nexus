"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Script from "next/script";
import {
  X, Check, Zap, Loader2, Crown, Users, FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { PLAN_LIMITS } from "@/lib/plan-config";
import type { Plan } from "@/types";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  resource: "members" | "projects";
  current: number;
  limit: number;
  currentPlan?: Plan;
}

const UPGRADE_PLANS: { key: Plan; popular?: boolean }[] = [
  { key: "STARTER" },
  { key: "PRO", popular: true },
  { key: "ENTERPRISE" },
];

export function UpgradeModal({
  open,
  onClose,
  resource,
  current,
  limit,
  currentPlan = "FREE",
}: UpgradeModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (plan: Plan) => {
    const config = PLAN_LIMITS[plan];
    if (!config.hasPaidPlan) {
      toast.error("Contact sales for Enterprise plan");
      return;
    }
    try {
      setLoading(plan);
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to create checkout session");
      }

      const data = await res.json();

      const rzpWindow = window as unknown as Record<string, unknown>;
      if (!rzpWindow.Razorpay) {
        toast.error("Razorpay SDK failed to load. Are you offline?");
        return;
      }

      const options = {
        key: data.key,
        subscription_id: data.subscriptionId,
        name: "Nexus",
        description: `${config.name} Plan Subscription`,
        prefill: data.prefill,
        notes: {
          organizationId: data.organizationId,
          plan: data.plan,
        },
        handler: async function () {
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
        theme: {
          color: "#6366f1",
        },
      };

      const RazorpayConstructor = rzpWindow.Razorpay as new (opts: unknown) => {
        on: (event: string, cb: (res: unknown) => void) => void;
        open: () => void;
      };

      const rzp = new RazorpayConstructor(options);
      rzp.on('payment.failed', function (response: unknown) {
        const err = response as { error?: { description?: string } };
        toast.error(`Payment failed: ${err.error?.description || "Unknown error"}`);
      });

      rzp.open();
    } catch (error: any) {
      toast.error(error.message || "Could not start checkout");
    } finally {
      setLoading(null);
    }
  };

  const resourceIcon = resource === "members" ? Users : FolderKanban;
  const ResourceIcon = resourceIcon;

  return (
    <AnimatePresence>
      {open && (
        <>
          <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass fixed left-1/2 top-1/2 z-50 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 sm:p-8"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/10">
                <ResourceIcon className="h-6 w-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                {resource === "members"
                  ? "You've reached your member limit"
                  : "You've reached your project limit"}
              </h2>
              <p className="mt-2 text-sm text-text-muted">
                Your <span className="font-medium text-text-primary">{PLAN_LIMITS[currentPlan].name}</span> plan
                allows up to <span className="font-medium text-text-primary">{limit}</span> {resource}.
                You currently have <span className="font-medium text-text-primary">{current}</span>.
                Upgrade to add more.
              </p>
            </div>

            {/* Pricing cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              {UPGRADE_PLANS.map(({ key, popular }) => {
                const config = PLAN_LIMITS[key];
                const isCurrent = key === currentPlan;
                const isDowngrade = getOrder(key) <= getOrder(currentPlan);

                return (
                  <div
                    key={key}
                    className={cn(
                      "relative rounded-xl border p-5 transition-all",
                      popular && !isCurrent
                        ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                        : "border-bg-elevated bg-bg-base",
                      isCurrent && "border-accent/40 ring-1 ring-accent/20"
                    )}
                  >
                    {popular && !isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent to-accent-light px-3 py-0.5 text-[11px] font-semibold text-white shadow-lg shadow-accent/25">
                        Most Popular
                      </span>
                    )}

                    <h3 className="text-sm font-semibold text-text-primary">{config.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-text-primary">${config.price}</span>
                      <span className="text-xs text-text-muted">/mo</span>
                    </div>

                    <ul className="mt-4 space-y-2">
                      {config.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-text-muted">
                          <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "mt-5 w-full text-sm",
                        isCurrent
                          ? "border-accent/30 text-accent pointer-events-none"
                          : popular
                            ? "bg-accent text-white hover:bg-accent/90"
                            : "border-bg-elevated text-text-primary hover:bg-bg-elevated"
                      )}
                      variant={isCurrent ? "outline" : popular ? "default" : "outline"}
                      size="sm"
                      disabled={isCurrent || isDowngrade || !!loading}
                      onClick={() => handleUpgrade(key)}
                    >
                      {loading === key ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      ) : isCurrent ? (
                        <Crown className="mr-2 h-3.5 w-3.5" />
                      ) : (
                        <Zap className="mr-2 h-3.5 w-3.5" />
                      )}
                      {isCurrent ? "Current Plan" : isDowngrade ? "—" : "Upgrade"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function getOrder(plan: Plan): number {
  const order: Record<Plan, number> = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };
  return order[plan];
}
