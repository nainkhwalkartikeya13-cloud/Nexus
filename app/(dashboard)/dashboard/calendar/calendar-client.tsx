"use client";

import { useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    CheckCircle2,
    Clock,
    MapPin,
    X,
    Trash2,
    Edit2,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

interface Project {
    id: string;
    name: string;
    emoji: string;
}

interface CalendarClientProps {
    projects: Project[];
}

export function CalendarClient({ projects }: CalendarClientProps) {
    const [view, setView] = useState("dayGridMonth");
    const [events, setEvents] = useState<Record<string, unknown>[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);

    const fetchEvents = useCallback(async (info?: { start: Date; end: Date }) => {
        setIsLoading(true);
        try {
            const start = info ? info.start.toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const end = info ? info.end.toISOString() : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

            const res = await fetch(`/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data);
            }
        } catch (error) {
            console.error("Failed to fetch events:", error);
            toast.error("Failed to load events");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleDateChange = (type: "prev" | "next" | "today") => {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;
        if (type === "prev") calendarApi.prev();
        else if (type === "next") calendarApi.next();
        else calendarApi.today();
    };

    const handleViewChange = (newView: string) => {
        const calendarApi = calendarRef.current?.getApi();
        if (!calendarApi) return;
        calendarApi.changeView(newView);
        setView(newView);
    };

    const handleEventDrop = async (info: { event: { id: string; startStr: string; endStr: string; allDay: boolean }; revert: () => void }) => {
        const { event } = info;
        const isTask = event.id.startsWith("task-");
        const id = event.id.replace(isTask ? "task-" : "event-", "");

        try {
            if (isTask) {
                await fetch(`/api/tasks/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ dueDate: event.startStr }),
                });
            } else {
                await fetch(`/api/calendar/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        startDate: event.startStr,
                        endDate: event.endStr,
                        allDay: event.allDay
                    }),
                });
            }
            toast.success("Event updated");
        } catch {
            info.revert();
            toast.error("Failed to update event");
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight">Calendar</h1>

                    <div className="flex items-center bg-bg-hover border border-border rounded-xl p-1">
                        <button
                            onClick={() => handleViewChange("dayGridMonth")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                view === "dayGridMonth" ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => handleViewChange("timeGridWeek")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                view === "timeGridWeek" ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => handleViewChange("timeGridDay")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                view === "timeGridDay" ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => handleViewChange("listMonth")}
                            className={cn(
                                "px-4 py-1.5 text-xs font-semibold rounded-lg transition-all",
                                view === "listMonth" ? "bg-accent text-white shadow-lg" : "text-text-muted hover:text-text-primary"
                            )}
                        >
                            List
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-bg-hover hover:bg-bg-elevated border border-border rounded-xl p-1 overflow-hidden">
                        <button onClick={() => handleDateChange("prev")} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleDateChange("today")}
                            className="px-3 py-1 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                            Today
                        </button>
                        <button onClick={() => handleDateChange("next")} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        New Event
                    </button>
                </div>
            </div>

            <div className="flex-1 glass border border-border rounded-2xl overflow-hidden relative">
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView={view}
                    events={events}
                    headerToolbar={false}
                    dayMaxEvents={true}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    eventDrop={handleEventDrop}
                    eventClick={(info) => {
                        const rect = info.el.getBoundingClientRect();
                        setSelectedEvent({
                            ...info.event.extendedProps,
                            title: info.event.title,
                            id: info.event.id,
                            start: info.event.start,
                            end: info.event.end,
                            color: info.event.backgroundColor,
                            x: rect.left,
                            y: rect.top
                        });
                    }}
                    datesSet={(info) => {
                        fetchEvents(info);
                    }}
                    eventContent={(eventInfo) => {
                        const isTask = eventInfo.event.id.startsWith("task-");
                        return (
                            <div className="flex items-center gap-1.5 overflow-hidden py-0.5">
                                {isTask ? (
                                    <CheckCircle2 className="w-3 h-3 shrink-0 opacity-70" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: eventInfo.event.backgroundColor }} />
                                )}
                                <span className="truncate flex-1">{eventInfo.event.title}</span>
                            </div>
                        );
                    }}
                    height="100%"
                />

                {isLoading && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50">
                        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-6 text-[11px] text-text-muted font-medium uppercase tracking-widest px-4">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
                    High Priority
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
                    Medium Priority
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
                    Low Priority
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" />
                    Team Events
                </div>
            </div>

            {/* Event Details Popup */}
            <AnimatePresence>
                {selectedEvent && (
                    <EventDetailPopup
                        event={selectedEvent}
                        onClose={() => setSelectedEvent(null)}
                        onDelete={async (id) => {
                            if (id.startsWith("task-")) {
                                toast.error("Please delete tasks from the task board");
                                return;
                            }
                            const realId = id.replace("event-", "");
                            const res = await fetch(`/api/calendar/${realId}`, { method: "DELETE" });
                            if (res.ok) {
                                setEvents(prev => prev.filter(e => e.id !== id));
                                setSelectedEvent(null);
                                toast.success("Event deleted");
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateEventModal
                    projects={projects}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(newEvent) => {
                        setEvents(prev => [...prev, {
                            id: `event-${newEvent.id}`,
                            title: newEvent.title,
                            start: newEvent.startDate,
                            end: newEvent.endDate,
                            allDay: newEvent.allDay,
                            color: newEvent.color,
                            extendedProps: {
                                type: "event",
                                description: newEvent.description,
                            }
                        }]);
                        setShowCreateModal(false);
                        toast.success("Event created");
                    }}
                />
            )}
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventDetailPopup({ event, onClose, onDelete }: { event: any, onClose: () => void, onDelete: (id: string) => void }) {
    const isTask = event.type === "task";

    // Calculate position (ensure it doesn't go off screen)
    const top = Math.min(event.y + 30, window.innerHeight - 300);
    const left = Math.min(event.x, window.innerWidth - 300);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="fixed z-[100] w-[280px] glass border border-border rounded-2xl shadow-2xl overflow-hidden shadow-black/50"
            style={{ top, left }}
        >
            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: event.color }} />
                        <span className="text-xs font-bold text-text-muted uppercase tracking-tighter">
                            {isTask ? "Task" : "Event"}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded-lg transition-colors text-text-muted">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <h3 className="text-sm font-bold text-text-primary mb-2 leading-tight">
                    {event.title}
                </h3>

                {isTask ? (
                    <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                event.priority === "HIGH" ? "bg-red-500/20 text-red-400" :
                                    event.priority === "MEDIUM" ? "bg-amber-500/20 text-amber-400" :
                                        "bg-emerald-500/20 text-emerald-400"
                            )}>
                                {event.priority}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-bg-hover text-text-secondary">
                                {event.status}
                            </span>
                        </div>

                        <div className="space-y-2 mt-4 text-[13px]">
                            <div className="flex items-center gap-2 text-text-secondary">
                                <MapPin className="w-3.5 h-3.5" />
                                {event.projectName}
                            </div>
                            <div className="flex items-center gap-2 text-text-secondary">
                                <Clock className="w-3.5 h-3.5" />
                                Due {format(new Date(event.start), "MMM d, yyyy")}
                            </div>
                        </div>

                        <button className="w-full mt-4 flex items-center justify-center gap-2 bg-bg-hover hover:bg-bg-elevated text-text-primary py-2 rounded-xl text-xs font-bold transition-colors">
                            Open Task
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {event.description && (
                            <p className="text-xs text-text-secondary line-clamp-3">
                                {event.description}
                            </p>
                        )}

                        <div className="space-y-2 text-[13px]">
                            <div className="flex items-center gap-2 text-text-secondary">
                                <Clock className="w-3.5 h-3.5" />
                                {format(new Date(event.start), "h:mm a")}
                                {event.end && ` - ${format(new Date(event.end), "h:mm a")}`}
                            </div>
                            {event.projectName && (
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {event.projectName}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-4">
                            <button className="flex-1 flex items-center justify-center gap-2 bg-bg-hover hover:bg-bg-elevated text-text-primary py-2 rounded-xl text-xs font-bold transition-colors">
                                <Edit2 className="w-3 h-3" />
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(event.id)}
                                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CreateEventModal({ projects, onClose, onSuccess }: { projects: Project[], onClose: () => void, onSuccess: (event: any) => void }) {
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        startDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        endDate: "",
        allDay: true,
        color: "#6366f1",
        projectId: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/calendar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    projectId: formData.projectId || null,
                    startDate: new Date(formData.startDate).toISOString(),
                    endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null
                })
            });
            if (res.ok) {
                const data = await res.json();
                onSuccess(data);
            } else {
                toast.error("Failed to create event");
            }
        } catch {
            toast.error("Internal Error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md glass border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-text-primary">Create Event</h2>
                        <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded-lg transition-colors text-text-muted">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Title</label>
                            <input
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="What's happening?"
                                className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">From</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.startDate}
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">To (Optional)</label>
                                <input
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 py-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.allDay}
                                    onChange={e => setFormData({ ...formData, allDay: e.target.checked })}
                                />
                                <div className="w-10 h-5 bg-border/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-text-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-primary after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent" />
                            </label>
                            <span className="text-xs font-bold text-text-secondary uppercase">All Day Event</span>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Project (Optional)</label>
                            <select
                                value={formData.projectId}
                                onChange={e => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full bg-bg-hover border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all appearance-none"
                            >
                                <option value="">No Project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 ml-1">Color</label>
                            <div className="flex items-center gap-2">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: c })}
                                        className={cn(
                                            "w-7 h-7 rounded-lg transition-all",
                                            formData.color === c ? "scale-110 ring-2 ring-border/50 shadow-md" : "opacity-50 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]"
                            >
                                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create Event"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}
