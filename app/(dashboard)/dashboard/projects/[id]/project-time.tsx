"use client";

import { useEffect, useState } from "react";
import { Clock, Users, ArrowUpRight, TrendingUp } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface TimeEntry {
    id: string;
    description: string | null;
    startTime: string;
    duration: number | null;
    user: { name: string; avatar: string | null };
}

interface ProjectTimeProps {
    projectId: string;
}

export function ProjectTime({ projectId }: ProjectTimeProps) {
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/time-entries?projectId=${projectId}&userId=all`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setEntries(data);
            })
            .finally(() => setLoading(false));
    }, [projectId]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h === 0) return `${m}m`;
        return `${h}h ${m}m`;
    };

    // Calculate member breakdown
    const memberStats = entries.reduce((acc: any, entry) => {
        const name = entry.user.name;
        if (!acc[name]) acc[name] = { hours: 0, entries: 0, avatar: entry.user.avatar };
        acc[name].hours += (entry.duration || 0) / 3600;
        acc[name].entries += 1;
        return acc;
    }, {});

    const totalHours = Object.values(memberStats).reduce((sum: number, m: any) => sum + m.hours, 0);

    if (loading) {
        return <div className="p-8 animate-pulse space-y-4">
            <div className="h-20 bg-white/5 rounded-xl block" />
            <div className="h-64 bg-white/5 rounded-xl block" />
        </div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 h-full overflow-y-auto scrollbar-none">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 glass border-white/5 bg-gradient-to-br from-accent/5 to-transparent">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-accent/10 text-accent">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Total Invested</span>
                    </div>
                    <p className="text-3xl font-black text-white tabular-nums">{Math.round(totalHours * 10) / 10}h</p>
                    <p className="text-[10px] text-text-muted mt-1 font-bold">Accumulated over {entries.length} sessions</p>
                </Card>

                <Card className="p-6 glass border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Users className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Active Members</span>
                    </div>
                    <p className="text-3xl font-black text-white">{Object.keys(memberStats).length}</p>
                    <p className="text-[10px] text-text-muted mt-1 font-bold">Contributing to this project</p>
                </Card>

                <Card className="p-6 glass border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Efficiency</span>
                    </div>
                    <p className="text-3xl font-black text-white">92%</p>
                    <p className="text-[10px] text-emerald-500 mt-1 font-bold uppercase tracking-tighter flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Optimal momentum
                    </p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Member Breakdown */}
                <Card className="lg:col-span-1 p-6 glass border-white/5 h-fit">
                    <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent" />
                        Team Contribution
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(memberStats).map(([name, stat]: [string, any]) => {
                            const pct = totalHours > 0 ? (stat.hours / totalHours) * 100 : 0;
                            return (
                                <div key={name} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                                                {name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-text-primary">{name}</span>
                                        </div>
                                        <span className="text-xs font-black text-white">{Math.round(stat.hours * 10) / 10}h</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-accent rounded-full transition-all duration-1000"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Detailed Logs */}
                <Card className="lg:col-span-2 p-6 glass border-white/5">
                    <h3 className="font-bold text-white mb-6">Activity Timeline</h3>
                    <div className="space-y-4">
                        {entries.length === 0 ? (
                            <div className="text-center py-20 text-text-muted text-sm italic">
                                No activity recorded for this project yet.
                            </div>
                        ) : (
                            entries.map((entry) => (
                                <div key={entry.id} className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-all border border-transparent hover:border-white/5">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-black text-indigo-300 border border-indigo-500/10 shrink-0">
                                        {entry.user.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-primary truncate">{entry.description || "Work Session"}</p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-text-subtle uppercase tracking-wider">{entry.user.name}</span>
                                            <span className="h-1 w-1 rounded-full bg-white/10" />
                                            <span className="text-[10px] text-text-muted">{new Date(entry.startTime).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-sm font-black text-white tabular-nums">
                                            {entry.duration ? formatDuration(entry.duration) : "Running"}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
