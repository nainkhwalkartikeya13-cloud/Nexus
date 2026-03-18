"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function SidebarMiniCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [eventDays, setEventDays] = useState<string[]>([]);

    useEffect(() => {
        // Fetch event days for the current month to show dots
        const fetchEventDays = async () => {
            const start = startOfMonth(currentDate).toISOString();
            const end = endOfMonth(currentDate).toISOString();
            try {
                const res = await fetch(`/api/calendar?start=${start}&end=${end}`);
                if (res.ok) {
                    const events = await res.json();
                    const days = events.map((e: { start: string }) => format(new Date(e.start), "yyyy-MM-dd"));
                    setEventDays(Array.from(new Set(days)) as string[]);
                }
            } catch {
                console.error("Failed to fetch mini calendar events");
            }
        };
        fetchEventDays();
    }, [currentDate]);

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
    });

    // Calculate empty padding days for the first row
    const startDay = startOfMonth(currentDate).getDay();
    const paddingBefore = Array.from({ length: startDay }).map((_, i) => i);

    return (
        <div className="mt-8 px-2 select-none">
            <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Outline</h3>
                <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-bg-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
                        <ChevronLeft className="w-3 h-3" />
                    </button>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-bg-hover rounded-md transition-colors text-text-muted hover:text-text-primary">
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            </div>

            <div className="p-2 glass border border-border rounded-xl bg-bg-hover/50">
                <div className="text-[13px] font-bold text-text-primary mb-3 text-center">
                    {format(currentDate, "MMMM yyyy")}
                </div>

                <div className="grid grid-cols-7 gap-y-1 text-center">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={`day-${i}`} className="text-[9px] font-black text-text-muted/60 mb-1">{d}</span>
                    ))}

                    {paddingBefore.map(i => <div key={`pad-${i}`} />)}

                    {days.map(day => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const hasEvent = eventDays.includes(dateStr);
                        const today = isToday(day);

                        return (
                            <Link
                                key={dateStr}
                                href={`/dashboard/calendar?date=${dateStr}`}
                                className={cn(
                                    "relative flex flex-col items-center justify-center p-1.5 rounded-lg text-xs transition-all hover:bg-bg-hover",
                                    today ? "text-accent font-black" : "text-text-secondary font-medium"
                                )}
                            >
                                {format(day, "d")}
                                {hasEvent && (
                                    <div className="absolute bottom-0.5 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
