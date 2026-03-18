"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Play, Square, Clock, DollarSign, BarChart3, Zap, Trash2, Users, ChevronDown, FolderKanban, CircleDollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Badge } from "@/components/shared/Badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { ProjectSelect } from "@/components/dashboard/project-select";
import { useSession } from "next-auth/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project { id: string; name: string; emoji: string; color: string; }
interface TaskInfo { id: string; title: string; }
interface TimeEntry {
    id: string;
    description: string | null;
    startTime: string;
    endTime: string | null;
    duration: number | null;
    billable: boolean;
    isPaid: boolean;
    hourlyRate: number | null;
    task: TaskInfo | null;
    project: Project | null;
    user?: { id: string; name: string; avatar: string | null };
}

interface Stats {
    totalHours: number;
    billableHours: number;
    utilizationRate: number;
    weeklyProgress: number;
    targetHours: number;
    dailyHours: { day: string; total: number; billable: number }[];
    projectBreakdown: { name: string; emoji: string; color: string; hours: number }[];
    recentEntries: TimeEntry[];
    todayTotal: number;
    weeklyEarnings: number;
}

interface Member {
    user: {
        id: string;
        name: string;
        avatar: string | null;
    };
    role: string;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

const BAR_COLORS = ["#e2e8f0", "#3b82f6", "#3b82f6", "#3b82f6", "#3b82f6", "#3b82f6", "#e2e8f0"];

export function TimeTrackerClient() {
    const { data: session } = useSession();
    const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "OWNER";

    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [description, setDescription] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [targetUserId, setTargetUserId] = useState<string | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [starting, setStarting] = useState(false);
    const [billable, setBillable] = useState(true);
    const [runningTeamEntries, setRunningTeamEntries] = useState<TimeEntry[]>([]);
    const [tickTrigger, setTickTrigger] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const activeUserId = targetUserId !== null ? targetUserId : (isAdmin ? "all" : session?.user?.id);

    const fetchStats = useCallback(() => {
        if (!activeUserId) return;
        setLoading(true);
        fetch(`/api/productivity/stats?userId=${activeUserId}`)
            .then(async (r) => {
                const data = await r.json();
                if (!r.ok || data.error) throw new Error(data.error || "Failed to fetch stats");
                return data;
            })
            .then((data) => setStats(data))
            .catch((err) => {
                toast.error(err.message);
            })
            .finally(() => setLoading(false));
    }, [activeUserId]);

    const fetchRunning = useCallback(() => {
        // Fetch personal running timer
        fetch("/api/time-entries/running")
            .then((r) => r.json())
            .then((data) => {
                if (data && data.id) {
                    setRunningEntry(data);
                    if (!targetUserId || targetUserId === session?.user?.id) {
                        setDescription(data.description || "");
                        setSelectedProjectId(data.projectId || null);
                    }
                } else {
                    setRunningEntry(null);
                }
            })
            .catch(() => { });

        // Fetch team active timers if an admin is inspecting others or the team
        if (isAdmin && activeUserId && activeUserId !== session?.user?.id) {
            fetch(`/api/time-entries/running?userId=${activeUserId}`)
                .then((r) => r.json())
                .then((data) => {
                    if (Array.isArray(data)) setRunningTeamEntries(data);
                    else if (data && data.id) setRunningTeamEntries([data]);
                    else setRunningTeamEntries([]);
                })
                .catch(() => { });
        } else {
            setRunningTeamEntries([]);
        }
    }, [activeUserId, targetUserId, isAdmin, session?.user?.id]);

    const fetchMembers = useCallback(() => {
        if (!isAdmin) return;
        fetch("/api/members")
            .then((r) => r.json())
            .then((data) => {
                if (data.members) setMembers(data.members);
            })
            .catch(() => { });
    }, [isAdmin]);

    useEffect(() => {
        if (session?.user?.id) {
            fetchStats();
            fetchRunning();
            fetchMembers();
        }
    }, [session?.user?.id, fetchStats, fetchRunning, fetchMembers]);

    // Live timer
    useEffect(() => {
        if (runningEntry || runningTeamEntries.length > 0) {
            // Initial calculation
            if (runningEntry) {
                const startMs = new Date(runningEntry.startTime).getTime();
                setElapsed(Math.floor((Date.now() - startMs) / 1000));
            }

            timerRef.current = setInterval(() => {
                if (runningEntry) {
                    const startMs = new Date(runningEntry.startTime).getTime();
                    setElapsed(Math.floor((Date.now() - startMs) / 1000));
                }
                if (runningTeamEntries.length > 0) {
                    setTickTrigger(t => t + 1); // Force re-render for team timers
                }
            }, 1000);
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        } else {
            setElapsed(0);
        }
    }, [runningEntry, runningTeamEntries.length]);

    const handleStart = async () => {
        setStarting(true);
        try {
            const res = await fetch("/api/time-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: description || "Working...",
                    projectId: selectedProjectId,
                    billable,
                }),
            });
            if (res.ok) {
                const entry = await res.json();
                setRunningEntry(entry);
                toast.success("Timer started! ⏱️");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to start");
            }
        } catch { toast.error("Failed to start timer"); }
        finally { setStarting(false); }
    };

    const handleStop = async () => {
        try {
            const res = await fetch("/api/time-entries/stop", { method: "POST" });
            if (res.ok) {
                setRunningEntry(null);
                setDescription("");
                setSelectedProjectId(null);
                toast.success("Timer stopped! ✅");
                fetchStats();
            }
        } catch { toast.error("Failed to stop timer"); }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Entry deleted"); fetchStats(); }
        } catch { toast.error("Failed"); }
    };

    const handleTogglePaid = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch(`/api/time-entries/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isPaid: !currentStatus }),
            });
            if (res.ok) {
                toast.success(currentStatus ? "Marked as unpaid" : "Marked as paid");
                fetchStats();
            } else {
                toast.error("Failed to update status");
            }
        } catch { toast.error("Failed to update status"); }
    };

    const activeMember = members.find(m => m.user.id === activeUserId);

    if (loading && !stats) {
        return (
            <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
                <div className="h-8 w-48 bg-bg-hover rounded-lg" />
                <div className="h-[200px] bg-bg-surface border border-border rounded-2xl" />
                <div className="grid grid-cols-4 gap-6">{[1, 2, 3, 4].map(i => <div key={i} className="h-[120px] bg-bg-surface border border-border rounded-2xl" />)}</div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <PageHeader heading="Time Tracker" description="Track billable hours and monitor productivity" />

                {isAdmin && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" className="h-11 px-4 gap-2 border-accent/20 hover:bg-accent/5">
                                <Users className="h-4 w-4 text-accent" />
                                <span className="font-bold text-sm">
                                    {activeUserId === "all" ? "Team Overview" : (activeUserId === session?.user?.id ? "Your Activity" : activeMember?.user.name)}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 glass" align="end">
                            <DropdownMenuItem
                                className={cn("p-2 rounded-lg cursor-pointer", activeUserId === "all" && "bg-accent/10 text-accent font-bold")}
                                onClick={() => setTargetUserId("all")}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px]">ALL</div>
                                    Team Overview
                                </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                className={cn("p-2 rounded-lg cursor-pointer", activeUserId === session?.user?.id && "bg-accent/10 text-accent font-bold")}
                                onClick={() => setTargetUserId(session?.user?.id as string)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">YOU</div>
                                    Your Activity
                                </div>
                            </DropdownMenuItem>
                            <div className="h-px bg-border my-1" />
                            {members.filter(m => m.user.id !== session?.user?.id).map((member) => (
                                <DropdownMenuItem
                                    key={member.user.id}
                                    className={cn("p-2 rounded-lg cursor-pointer", activeUserId === member.user.id && "bg-accent/10 text-accent font-bold")}
                                    onClick={() => setTargetUserId(member.user.id)}
                                >
                                    {member.user.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* ── LIVE TIMER WIDGET (Always Your Personal Timer) ── */}
            <Card className="p-0 overflow-hidden shadow-2xl border-2 border-accent/20 relative group">
                {isAdmin && activeUserId === "all" && (
                    <div className="absolute top-4 right-4 z-20">
                        <span className="bg-accent/10 px-2 py-1 rounded-md text-accent border border-accent/20 uppercase font-black tracking-widest text-[9px]">
                            Your Personal Timer
                        </span>
                    </div>
                )}
                {runningEntry && (
                    <div className="absolute inset-0 bg-accent/5 animate-pulse pointer-events-none" />
                )}
                <div className={cn(
                    "p-8 transition-all relative z-10",
                    runningEntry
                        ? "bg-gradient-to-r from-accent/10 via-transparent to-emerald-500/10"
                        : "bg-bg-surface"
                )}>
                    <div className="flex flex-col lg:flex-row items-center gap-8">
                        <div className="flex-shrink-0 text-center relative">
                            <p className={cn(
                                "font-mono text-6xl font-black tracking-wider tabular-nums transition-colors duration-500",
                                runningEntry ? "text-accent" : "text-text-subtle"
                            )}>
                                {formatDuration(elapsed)}
                            </p>
                            {runningEntry && (
                                <div className="absolute -top-4 -right-4 h-12 w-12 border-4 border-accent/30 rounded-full animate-ping pointer-events-none" />
                            )}
                            {runningEntry && (
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-3 flex items-center justify-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
                                    Recording Session
                                </p>
                            )}
                        </div>

                        <div className="flex-1 w-full flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full space-y-3">
                                <input
                                    type="text"
                                    placeholder="What are you working on?"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={!!runningEntry}
                                    className="w-full px-5 py-3.5 bg-bg-base border border-border rounded-xl text-sm font-bold text-text-primary placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-accent/40 shadow-inner disabled:opacity-80 disabled:cursor-not-allowed"
                                />
                                <div className="flex flex-col sm:flex-row gap-3 items-center">
                                    <div className="flex-1 min-w-[200px]">
                                        <ProjectSelect
                                            value={selectedProjectId}
                                            onChange={setSelectedProjectId}
                                            placeholder="Tag a project..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!!runningEntry}
                                        onClick={() => setBillable(!billable)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shrink-0",
                                            billable
                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20"
                                                : "bg-bg-hover text-text-muted border-border hover:bg-bg-surface",
                                            !!runningEntry && "opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        <CircleDollarSign className="h-4 w-4" />
                                        {billable ? "Billable" : "Non-Billable"}
                                    </button>
                                </div>
                            </div>
                            <div className="shrink-0 w-full md:w-auto h-full flex md:flex-col gap-3">
                                {runningEntry ? (
                                    <Button onClick={handleStop} size="lg" className="flex-1 bg-red-500 hover:bg-red-600 border-red-500 text-white min-w-[140px] text-sm font-black shadow-lg shadow-red-500/20 h-full">
                                        <Square className="h-4 w-4 mr-2 fill-white" /> Stop Session
                                    </Button>
                                ) : (
                                    <Button onClick={handleStart} loading={starting} size="lg" className="flex-1 bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white min-w-[140px] text-sm font-black shadow-lg shadow-emerald-500/20 h-full">
                                        <Play className="h-4 w-4 mr-2 fill-white" /> Start Timer
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* ── ACTIVE TEAM TIMERS (Admin View) ── */}
            {isAdmin && activeUserId !== session?.user?.id && runningTeamEntries.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-display font-bold text-text-primary flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Active {activeUserId === "all" ? "Team" : "Member"} Timers
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {runningTeamEntries.map(entry => (
                            <Card key={entry.id} className="p-4 bg-gradient-to-br from-bg-surface to-bg-hover border-accent/20 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-all" />
                                <div className="flex items-start justify-between mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-bg-surface flex items-center justify-center font-bold text-accent shadow-sm border border-border">
                                            {entry.user?.name?.slice(0, 2).toUpperCase() || "?"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-text-primary">{entry.user?.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Working</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="font-mono font-black text-xl tabular-nums text-text-primary">
                                        {formatDuration(Math.floor((Date.now() - new Date(entry.startTime).getTime()) / 1000))}
                                    </p>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    <p className="text-sm font-semibold text-text-secondary truncate">
                                        {entry.description || "No description provided"}
                                    </p>
                                    {entry.project && (
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.project.color }} />
                                            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{entry.project.name}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ── METRIC CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricBox
                    label="Today"
                    value={formatHours(stats.todayTotal)}
                    icon={<Clock className="h-5 w-5" />}
                    iconBg="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                />
                <MetricBox
                    label="This Week"
                    value={`${stats.totalHours}h / ${stats.targetHours}h`}
                    icon={<BarChart3 className="h-5 w-5" />}
                    iconBg="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20"
                    sub={<div className="w-full h-1.5 bg-bg-hover rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(stats.weeklyProgress, 100)}%` }} />
                    </div>}
                />
                <MetricBox
                    label="Utilization"
                    value={`${stats.utilizationRate}%`}
                    icon={<Zap className="h-5 w-5" />}
                    iconBg={cn("text-white", stats.utilizationRate >= 70 ? "bg-emerald-500" : stats.utilizationRate >= 40 ? "bg-amber-500" : "bg-red-400")}
                    sub={
                        <p className="text-[10px] text-text-muted font-bold mt-2 uppercase tracking-wider">
                            {formatHours(stats.billableHours)} billable / {formatHours(stats.totalHours)} total
                        </p>
                    }
                />
                <MetricBox
                    label="Earnings"
                    value={formatCurrency(stats.weeklyEarnings)}
                    icon={<DollarSign className="h-5 w-5" />}
                    iconBg="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                    sub={
                        stats.weeklyEarnings > 0 ? (
                            <p className="text-[10px] text-text-muted font-bold mt-2 uppercase tracking-wider">
                                {formatHours(stats.billableHours)} billable hrs this week
                            </p>
                        ) : (
                            <p className="text-[10px] text-amber-500 font-bold mt-2">
                                Set hourly rates in Members page
                            </p>
                        )
                    }
                />
            </div>

            {/* ── CHARTS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 p-6 shadow-sm">
                    <h3 className="font-display font-bold text-text-primary mb-6">Weekly Activity</h3>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.dailyHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tick={{ fontWeight: 700 }} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tick={{ fontWeight: 700 }} tickFormatter={(v) => `${v}h`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "var(--bg-surface)", borderColor: "var(--border)", borderRadius: "12px", fontSize: "12px", fontWeight: 700 }}
                                    formatter={(value: any) => [`${value}h`, undefined]}
                                />
                                <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={32} name="Total">
                                    {stats.dailyHours.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i]} />
                                    ))}
                                </Bar>
                                <Bar dataKey="billable" radius={[8, 8, 0, 0]} barSize={20} fill="#10b981" opacity={0.6} name="Billable" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 shadow-sm">
                    <h3 className="font-display font-bold text-text-primary mb-6">Project Allocation</h3>
                    {stats.projectBreakdown.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-sm text-text-muted italic gap-2 text-center">
                            <FolderKanban className="h-8 w-8 opacity-20" />
                            No projects tracked this week
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {stats.projectBreakdown.map((p) => {
                                const pct = stats!.totalHours > 0 ? (p.hours / stats!.totalHours) * 100 : 0;
                                return (
                                    <div key={p.name} className="group/item">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="shrink-0 grayscale group-hover/item:grayscale-0 transition-all">{p.emoji}</span>
                                                <span className="text-xs font-bold text-text-primary truncate">{p.name}</span>
                                            </div>
                                            <span className="text-xs font-black text-text-primary shrink-0 transition-transform group-hover/item:scale-110">{formatHours(p.hours)}</span>
                                        </div>
                                        <div className="h-2 bg-bg-hover rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* ── ENTRY LOG ── */}
            <Card className="p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display font-bold text-text-primary">Recent Logs</h3>
                    <Badge className="bg-bg-hover text-text-muted border-border font-bold">{stats.recentEntries.length} entries</Badge>
                </div>
                {stats.recentEntries.length === 0 ? (
                    <div className="text-center py-12 text-text-muted text-sm italic flex flex-col items-center gap-3">
                        <Clock className="h-8 w-8 opacity-20" />
                        No time tracked {targetUserId ? "by this member " : ""}yet
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stats.recentEntries.map((entry: TimeEntry) => {
                            const entryDate = new Date(entry.startTime);
                            const isToday = entryDate.toDateString() === new Date().toDateString();
                            const earnedAmt = entry.billable && entry.duration && entry.hourlyRate
                                ? (entry.duration / 3600) * entry.hourlyRate
                                : 0;

                            return (
                                <div key={entry.id} className="flex items-center gap-4 p-4 rounded-xl bg-bg-hover/50 hover:bg-bg-hover transition-all group border border-transparent hover:border-border">
                                    {entry.project ? (
                                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm transition-transform group-hover:rotate-6" style={{ backgroundColor: entry.project.color + "25" }}>
                                            {entry.project.emoji}
                                        </div>
                                    ) : (
                                        <div className="h-10 w-10 rounded-xl bg-bg-surface border border-dashed border-border flex items-center justify-center shrink-0">
                                            <Clock className="h-4 w-4 text-text-muted opacity-40" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            {activeUserId === "all" && entry.user && (
                                                <span className="text-[10px] font-black text-accent uppercase tracking-wider bg-accent/10 px-1.5 py-0.5 rounded-md">
                                                    {entry.user.name}
                                                </span>
                                            )}
                                            <p className="text-sm font-bold text-text-primary truncate transition-colors group-hover:text-accent">
                                                {entry.description || "No description"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {entry.billable ? (
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                                                    💰 Billable
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-bg-surface text-text-muted border border-border/50">
                                                    Non-Billable
                                                </span>
                                            )}
                                            {entry.project && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.project.color }} />
                                                    <span className="text-[10px] text-text-muted font-black uppercase tracking-wider">{entry.project.name}</span>
                                                </div>
                                            )}
                                            {entry.task && (
                                                <span className="text-[10px] text-accent font-black uppercase tracking-wider px-2 py-0.5 bg-accent/10 rounded-md">
                                                    {entry.task.title}
                                                </span>
                                            )}
                                            {!isToday && (
                                                <span className="text-[10px] text-text-subtle font-black uppercase tracking-wider bg-bg-surface px-2 py-0.5 rounded-md border border-border/50">
                                                    {entryDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        {entry.billable && earnedAmt > 0 && (
                                            <div className="text-right hidden sm:block mr-2">
                                                <p className="font-mono text-sm font-black text-text-primary tabular-nums">
                                                    {formatCurrency(earnedAmt)}
                                                </p>
                                                <Badge className={cn("text-[9px] uppercase font-bold mt-1", entry.isPaid ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-border")}>
                                                    {entry.isPaid ? "Paid" : "Pending"}
                                                </Badge>
                                            </div>
                                        )}
                                        <div className="text-right hidden sm:block">
                                            <p className={cn(
                                                "font-mono text-sm font-black tabular-nums",
                                                entry.endTime ? "text-text-primary" : "text-emerald-500"
                                            )}>
                                                {entry.duration ? formatDuration(entry.duration) : "Running"}
                                            </p>
                                            <p className="text-[9px] text-text-subtle font-bold uppercase mt-1">
                                                {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        {isAdmin && entry.billable && entry.endTime && earnedAmt > 0 && (
                                            <button
                                                onClick={() => handleTogglePaid(entry.id, entry.isPaid)}
                                                className="h-8 px-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center rounded-lg bg-bg-surface border border-border hover:bg-bg-hover transition-all shadow-sm"
                                            >
                                                Mark {entry.isPaid ? "Unpaid" : "Paid"}
                                            </button>
                                        )}
                                        {entry.id !== runningEntry?.id && (activeUserId === session?.user?.id) && (
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-danger/10 hover:text-danger opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}

function MetricBox({ label, value, icon, iconBg, sub }: {
    label: string; value: string; icon: React.ReactNode; iconBg: string; sub?: React.ReactNode;
}) {
    return (
        <Card className="p-6 shadow-sm border border-border/50 hover:border-accent/20 transition-all group">
            <div className="flex items-center gap-4 mb-4">
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110", iconBg)}>
                    {icon}
                </div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</p>
            </div>
            <p className="text-2xl font-black text-text-primary tracking-tight tabular-nums">{value}</p>
            {sub}
        </Card>
    );
}

