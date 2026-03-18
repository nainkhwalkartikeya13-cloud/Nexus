"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NexusLogo } from "@/components/shared/NexusLogo";
import {
    LayoutDashboard,
    FolderKanban,
    CheckSquare,
    Users,
    CreditCard,
    Settings2,
    LogOut,
    FileText,
    CalendarDays,
    TrendingUp,
    Receipt,
    UserCircle,
    Wallet,
    Timer,
    Target,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import { SidebarMiniCalendar } from "./SidebarMiniCalendar";
import { useEffect, useState } from "react";
import type { Document } from "@/types";
import { OrgSwitcher } from "./org-switcher";
import { OrgMemberRole } from "@prisma/client";

interface SidebarProps {
    user: {
        name?: string | null;
        email?: string | null;
        avatar?: string | null;
        role?: string;
    };
    /*
      ### 3. Implemented Organization Switcher
    - **Multi-Tenant Context**: Resolved the issue where members added to multiple organizations were stuck in their default one.
    - **Dynamic Switching**: Users can now toggle between different workspaces from the sidebar.
    - **Session Sync**: The authentication system now supports real-time session updates when switching organizations, ensuring projects and permissions refresh instantly.
    */
    organization: {
        id: string;
        name: string;
        plan: string;
    };
    organizations: {
        id: string;
        name: string;
        logo: string | null;
        role: OrgMemberRole;
    }[];
}

const navItems = [
    {
        section: "WORKSPACE",
        items: [
            { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            { name: "Projects", href: "/dashboard/projects", icon: FolderKanban },
            { name: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
            { name: "Docs", href: "/dashboard/docs", icon: FileText },
            { name: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
            { name: "Members", href: "/dashboard/members", icon: Users },
            { name: "Time Tracker", href: "/dashboard/time", icon: Timer },
            { name: "Goals", href: "/dashboard/goals", icon: Target },
        ],
    },
    {
        section: "FINANCE",
        items: [
            { name: "Revenue", href: "/dashboard/finance", icon: TrendingUp },
            { name: "Invoices", href: "/dashboard/finance/invoices", icon: Receipt },
            { name: "Clients", href: "/dashboard/finance/clients", icon: UserCircle },
            { name: "Expenses", href: "/dashboard/finance/expenses", icon: Wallet },
        ],
    },
    {
        section: "ACCOUNT",
        items: [
            { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
            { name: "Settings", href: "/dashboard/settings", icon: Settings2 },
        ],
    },
];

export function Sidebar({ user, organization, organizations }: SidebarProps) {
    const pathname = usePathname();
    const [recentDocs, setRecentDocs] = useState<Pick<Document, "id" | "emoji" | "title">[]>([]);

    useEffect(() => {
        fetch("/api/documents")
            .then((r) => r.json())
            .then((docs: Document[]) => {
                if (Array.isArray(docs)) {
                    setRecentDocs(docs.slice(0, 3).map((d) => ({ id: d.id, emoji: d.emoji, title: d.title })));
                }
            })
            .catch(() => { });
    }, [pathname]);

    return (
        <aside className="sidebar w-[240px] h-full fixed left-0 top-0 bg-bg-surface/60 backdrop-blur-xl border-r border-border z-40 hidden md:flex flex-col shadow-sm">
            {/* Header: Logo & Org Pill */}
            <div className="p-6 flex flex-col gap-5">
                <div className="flex items-center gap-3 group/logo">
                    <NexusLogo className="w-10 h-10 text-accent transform group-hover/logo:rotate-6 transition-transform cursor-pointer" />
                    <span className="text-2xl font-black tracking-tighter text-text-primary group-hover/logo:text-accent transition-colors">
                        Nexus
                    </span>
                </div>

                <OrgSwitcher
                    currentOrg={organization}
                    organizations={organizations as any}
                />
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 py-2 space-y-8 overflow-y-auto scrollbar-thin">
                {navItems.map((group, groupIdx) => {
                    // Restrict the "FINANCE" section to Owners and Admins only
                    if (group.section === "FINANCE" && user.role !== "OWNER" && user.role !== "ADMIN") {
                        return null;
                    }

                    return (
                        <div key={group.section}>
                            <h4 className="px-3 mb-2 text-[10px] uppercase font-bold text-text-subtle tracking-widest">
                                {group.section}
                            </h4>
                            <ul className="space-y-1">
                                {group.items.map((item, itemIdx) => {
                                    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                                    return (
                                        <motion.li
                                            key={item.href}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: (groupIdx * 4 + itemIdx) * 0.05 }}
                                        >
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 group",
                                                    isActive
                                                        ? "text-accent-text bg-accent/10 border border-accent/20 shadow-sm"
                                                        : "text-text-secondary hover:text-text-primary hover:bg-bg-hover active:scale-[0.98]"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="sidebar-active-indicator"
                                                        className="absolute left-0 w-1 h-full bg-accent rounded-r-md"
                                                        initial={false}
                                                        transition={{
                                                            type: "spring",
                                                            stiffness: 400,
                                                            damping: 30,
                                                        }}
                                                    />
                                                )}
                                                <item.icon
                                                    className={cn(
                                                        "w-4 h-4 transition-colors",
                                                        isActive
                                                            ? "text-accent"
                                                            : "text-text-muted group-hover:text-text-secondary"
                                                    )}
                                                />
                                                {item.name}
                                            </Link>
                                        </motion.li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}

                {/* Recent Docs */}
                {recentDocs.length > 0 && (
                    <div>
                        <h4 className="px-3 mb-2 text-[10px] uppercase font-bold text-text-subtle tracking-widest">
                            Recent Docs
                        </h4>
                        <ul className="space-y-0.5">
                            {recentDocs.map((doc) => (
                                <li key={doc.id}>
                                    <Link
                                        href={`/dashboard/docs/${doc.id}`}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all group",
                                            pathname === `/dashboard/docs/${doc.id}`
                                                ? "text-accent-text bg-accent-light border border-accent/20"
                                                : "text-text-muted hover:text-text-primary hover:bg-bg-hover"
                                        )}
                                    >
                                        <span className="shrink-0">{doc.emoji}</span>
                                        <span className="truncate">{doc.title || "Untitled"}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </nav>

            {/* User Card */}
            <div className="p-5 bg-bg-surface border-t border-border mt-auto rounded-t-3xl">
                <Link href="/dashboard/profile" className="flex items-center gap-4 p-2 -mx-2 rounded-xl hover:bg-bg-hover transition-colors group">
                    <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-black text-base shrink-0 shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
                        {getInitials(user?.name || "User")}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-text-primary truncate group-hover:text-accent transition-colors">
                            {user?.name || "User"}
                        </p>
                        <p className="text-[10px] font-black text-text-muted truncate capitalize tracking-[0.2em] mt-0.5 group-hover:text-text-secondary transition-colors">
                            View Profile
                        </p>
                    </div>
                </Link>

                <button
                    onClick={() => signOut()}
                    className="mt-6 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-text-muted transition-all hover:bg-danger-bg hover:text-danger border border-transparent hover:border-danger/20 group"
                >
                    <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    Logout
                </button>
            </div>

            <SidebarMiniCalendar />
        </aside>
    );
}
