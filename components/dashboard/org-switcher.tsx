"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
    Check,
    ChevronsUpDown,
    Building2,
    Plus,
    Crown,
    Shield,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface OrgSwitcherProps {
    currentOrg: {
        id: string;
        name: string;
        plan: string;
    };
    organizations: {
        id: string;
        name: string;
        logo: string | null;
        role: string;
    }[];
}

/* ── Palette for workspace avatars ─────────────────────────── */
const AVATAR_COLORS = [
    { bg: "bg-violet-500/20", text: "text-violet-400", border: "border-violet-500/30" },
    { bg: "bg-sky-500/20", text: "text-sky-400", border: "border-sky-500/30" },
    { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
    { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
    { bg: "bg-rose-500/20", text: "text-rose-400", border: "border-rose-500/30" },
    { bg: "bg-cyan-500/20", text: "text-cyan-400", border: "border-cyan-500/30" },
];

function hashIndex(str: string, len: number) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h) % len;
}

/* ── Role badge ───────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
    const r = role.toLowerCase();
    const isOwner = r === "owner";
    const isAdmin = r === "admin";

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-px rounded-md border",
                isOwner
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    : isAdmin
                        ? "bg-violet-500/15 text-violet-400 border-violet-500/25"
                        : "bg-slate-500/15 text-slate-400 border-slate-500/20"
            )}
        >
            {isOwner && <Crown className="h-2.5 w-2.5" />}
            {isAdmin && <Shield className="h-2.5 w-2.5" />}
            {role}
        </span>
    );
}

export function OrgSwitcher({ currentOrg, organizations }: OrgSwitcherProps) {
    const { update } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    const handleSwitch = async (orgId: string, role: string) => {
        if (orgId === currentOrg.id) return;

        setIsLoading(true);
        setSwitchingId(orgId);
        try {
            await update({ organizationId: orgId, role });

            await fetch("/api/user/active-org", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: orgId }),
            });

            toast.success(
                `Switched to ${organizations.find((o) => o.id === orgId)?.name}`
            );

            router.refresh();
            router.push("/dashboard");
        } catch (error) {
            console.error("Failed to switch organization:", error);
            toast.error("Failed to switch organization");
        } finally {
            setIsLoading(false);
            setSwitchingId(null);
        }
    };

    /* ── Trigger avatar color ─────────────────────────────── */
    const triggerColor =
        AVATAR_COLORS[hashIndex(currentOrg.id, AVATAR_COLORS.length)];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    disabled={isLoading}
                    className={cn(
                        "flex items-center justify-between w-full rounded-xl p-2.5 outline-none",
                        "bg-bg-hover/60 border border-border hover:border-accent/30",
                        "hover:bg-accent/5 transition-all duration-200",
                        "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
                        "group/trigger"
                    )}
                >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                        {/* Avatar */}
                        <div
                            className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border font-black text-sm transition-transform duration-200 group-hover/trigger:scale-105",
                                triggerColor.bg,
                                triggerColor.text,
                                triggerColor.border
                            )}
                        >
                            {currentOrg.name.slice(0, 1).toUpperCase()}
                        </div>

                        <div className="flex flex-col items-start min-w-0">
                            <span className="text-[13px] font-extrabold text-text-primary truncate max-w-[110px] leading-tight">
                                {currentOrg.name}
                            </span>
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5 mt-px">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                {currentOrg.plan}
                            </span>
                        </div>
                    </div>

                    <ChevronsUpDown className="h-3.5 w-3.5 text-text-muted group-hover/trigger:text-accent transition-colors shrink-0 ml-1" />
                </button>
            </DropdownMenuTrigger>

            {/* ── Dropdown panel ─────────────────────────────── */}
            <DropdownMenuContent
                className="w-[260px] glass border-white/10 rounded-xl p-0 shadow-2xl overflow-hidden"
                align="start"
                sideOffset={6}
            >
                {/* Header */}
                <div className="px-3.5 pt-3 pb-2">
                    <p className="text-[10px] font-extrabold uppercase text-text-muted tracking-[0.15em]">
                        Your Workspaces
                    </p>
                </div>

                <DropdownMenuSeparator className="bg-white/[0.06] m-0" />

                {/* Workspace list */}
                <div className="p-1.5 max-h-[240px] overflow-y-auto scrollbar-thin">
                    {organizations.map((org) => {
                        const isActive = org.id === currentOrg.id;
                        const isSwitching = switchingId === org.id;
                        const color =
                            AVATAR_COLORS[
                            hashIndex(org.id, AVATAR_COLORS.length)
                            ];

                        return (
                            <DropdownMenuItem
                                key={org.id}
                                disabled={isLoading}
                                onClick={() => handleSwitch(org.id, org.role)}
                                className={cn(
                                    "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all duration-150 outline-none cursor-pointer",
                                    isActive
                                        ? "bg-accent/10 focus:bg-accent/15 focus:text-accent-foreground ring-1 ring-accent/20"
                                        : "hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-text-primary active:scale-[0.98]"
                                )}
                            >
                                {/* Avatar */}
                                {org.logo ? (
                                    <img
                                        src={org.logo}
                                        alt={org.name}
                                        className="h-9 w-9 rounded-lg object-cover shrink-0 border border-white/10"
                                    />
                                ) : (
                                    <div
                                        className={cn(
                                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border font-black text-sm transition-all",
                                            isActive
                                                ? "bg-accent text-white border-accent shadow-md shadow-accent/30"
                                                : [color.bg, color.text, color.border]
                                        )}
                                    >
                                        {org.name.slice(0, 1).toUpperCase()}
                                    </div>
                                )}

                                {/* Text */}
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <span
                                        className={cn(
                                            "text-[13px] font-bold truncate",
                                            isActive
                                                ? "text-accent-text"
                                                : "text-text-primary"
                                        )}
                                    >
                                        {org.name}
                                    </span>
                                    <RoleBadge role={org.role} />
                                </div>

                                {/* Check / Spinner */}
                                {isSwitching ? (
                                    <Loader2 className="h-4 w-4 text-accent animate-spin shrink-0" />
                                ) : isActive ? (
                                    <div className="h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                                        <Check className="h-3 w-3 text-accent" />
                                    </div>
                                ) : null}
                            </DropdownMenuItem>
                        );
                    })}
                </div>

                <DropdownMenuSeparator className="bg-white/[0.06] m-0" />

                {/* Create new */}
                <div className="p-1.5">
                    <DropdownMenuItem
                        onClick={() => router.push("/onboarding?new=true")}
                        className="w-full flex items-center gap-3 p-2 rounded-lg text-left text-text-muted transition-all group/create outline-none cursor-pointer hover:text-text-primary hover:bg-white/[0.04] focus:bg-white/[0.04] focus:text-text-primary"
                    >
                        <div className="h-9 w-9 rounded-lg border border-dashed border-white/15 bg-white/[0.03] flex items-center justify-center shrink-0 group-hover/create:border-accent/30 group-hover/create:bg-accent/5 transition-all">
                            <Plus className="h-4 w-4 group-hover/create:text-accent transition-colors" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[13px] font-bold">
                                New Workspace
                            </span>
                            <span className="text-[10px] text-text-subtle">
                                Create an organization
                            </span>
                        </div>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
