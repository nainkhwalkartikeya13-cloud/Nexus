"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Search, Bell, Settings, LogOut, ChevronRight } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useCommandPalette } from "@/store/useCommandPalette";
import { PresenceAvatars } from "@/components/shared/PresenceAvatars";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface NavbarProps {
    user: {
        name?: string | null;
        email?: string | null;
        avatar?: string | null;
    };
}

export function Navbar({ user }: NavbarProps) {
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    // Derive breadcrumb from pathname
    const pathParts = pathname?.split("/").filter(Boolean) || [];
    const currentPage =
        pathParts.length > 1
            ? pathParts[1].charAt(0).toUpperCase() + pathParts[1].slice(1)
            : "Dashboard";

    useEffect(() => {
        // Initial fetch
        fetchUnreadCount();

        // Poll every 30s
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await fetch("/api/notifications/unread-count");
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count || 0);
            }
        } catch {
            // Silent fail
        }
    };

    const { setOpen } = useCommandPalette();

    const openCommandMenu = () => {
        setOpen(true);
    };

    return (
        <header className="h-[56px] sticky top-0 z-30 bg-bg-surface/85 backdrop-blur-[20px] border-b border-border px-4 md:px-6 flex items-center justify-between shadow-sm">
            {/* Breadcrumb / Left */}
            <div className="flex items-center text-sm font-semibold">
                <span className="text-text-subtle hidden sm:inline-block">Nexus</span>
                <ChevronRight className="w-4 h-4 mx-2 text-text-subtle hidden sm:inline-block" />
                <span className="text-text-secondary capitalize">{currentPage}</span>
            </div>

            {/* Right / Actions */}
            <div className="flex items-center gap-4">
                {/* Search trigger */}
                <button
                    onClick={openCommandMenu}
                    className="hidden md:flex items-center gap-3 px-4 py-2 w-[240px] bg-bg-base hover:bg-bg-hover border border-border rounded-xl text-[13px] text-text-muted transition-all duration-300 group shadow-sm hover:shadow-md"
                >
                    <Search className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                    <span className="flex-1 text-left font-black tracking-tight group-hover:text-text-primary">Search tasks...</span>
                    <kbd className="font-mono text-[9px] px-2 py-1 rounded-lg bg-bg-surface border border-border text-text-subtle group-hover:text-text-muted shadow-sm font-black uppercase">
                        ⌘K
                    </kbd>
                </button>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Real-time Presence */}
                <PresenceAvatars
                    pageId={pathParts.length > 1 ? `${pathParts[1]}-${pathParts[2] || 'index'}` : 'dashboard'}
                    className="mr-2"
                />

                {/* Notification Bell */}
                <div className="relative">
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors relative"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-danger border-2 border-bg-surface" />
                        )}
                    </button>
                    <NotificationDropdown
                        isOpen={showNotifications}
                        onClose={() => setShowNotifications(false)}
                    />
                </div>

                {/* User Dropdown */}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent hover:ring-accent/20 transition-all focus:outline-none shadow-sm">
                            {getInitials(user?.name || "User")}
                        </button>
                    </DropdownMenu.Trigger>

                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            align="end"
                            sideOffset={8}
                            className="w-56 bg-bg-surface border border-border rounded-2xl shadow-lg p-1.5 z-50 animate-fade-in"
                        >
                            <div className="px-2 py-2.5 border-b border-border mb-1">
                                <p className="text-sm font-bold text-text-primary truncate">
                                    {user?.name || "User"}
                                </p>
                                <p className="text-xs text-text-muted truncate">
                                    {user?.email || "No email"}
                                </p>
                            </div>

                            <DropdownMenu.Item asChild>
                                <a
                                    href="/dashboard/settings"
                                    className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg cursor-pointer outline-none transition-colors"
                                >
                                    <Settings className="w-4 h-4" />
                                    Profile settings
                                </a>
                            </DropdownMenu.Item>

                            <DropdownMenu.Separator className="h-px bg-border my-1" />

                            <DropdownMenu.Item
                                onSelect={(e) => {
                                    e.preventDefault();
                                    signOut({ callbackUrl: "/login" });
                                }}
                                className="flex items-center gap-2 px-2 py-2 text-sm font-bold text-danger hover:bg-danger-bg rounded-lg cursor-pointer outline-none transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            </div>
        </header>
    );
}
