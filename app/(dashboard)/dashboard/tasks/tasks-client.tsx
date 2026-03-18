"use client";

import { useState, useMemo, useEffect } from "react";
import NextImage from "next/image";
import {
    Search, Plus, Filter, Trash2,
    ChevronDown, ArrowUp, ArrowDown, Check, X,
    Calendar as CalendarIcon, User,
    Loader2, ExternalLink, CheckCircle2
} from "lucide-react";
import { format, isPast, isToday, isThisWeek } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/shared/Badge";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher-client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { TaskStatus, TaskPriority } from "@prisma/client";

interface Project {
    id: string;
    name: string;
    color: string;
}

interface UserData {
    id: string;
    name: string | null;
    avatar: string | null;
}

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    tags: string[];
    projectId: string;
    project: Project;
    assignedToId: string | null;
    assignedTo: UserData | null;
    createdAt: string;
}

interface Props {
    initialTasks: Task[];
    projects: Project[];
    members: { id: string; user: UserData }[];
    currentUserId: string;
    organizationId: string;
    userRole: string;
}

type SortField = "title" | "dueDate" | "priority" | "status" | "createdAt";
type SortOrder = "asc" | "desc";

export function TasksClient({ initialTasks, projects = [], members, currentUserId, organizationId, userRole }: Props) {
    const isAdmin = userRole === "OWNER" || userRole === "ADMIN";
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Slide-over state
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
    const [savingTask, setSavingTask] = useState(false);
    const [requestingAssignment, setRequestingAssignment] = useState(false);

    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: "",
        status: "TODO",
        priority: "MEDIUM",
        projectId: (projects && projects.length > 0) ? projects[0].id : "",
        tags: []
    });

    // Real-time sync with Pusher
    useEffect(() => {
        if (!organizationId || !pusherClient) return;
        const channel = pusherClient.subscribe(`org-${organizationId}`);

        channel.bind("task-updated", (updatedTask: Task) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            if (selectedTask?.id === updatedTask.id) {
                setSelectedTask(updatedTask);
            }
        });

        channel.bind("task-deleted", ({ taskId }: { taskId: string }) => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            if (selectedTask?.id === taskId) {
                setIsSlideOverOpen(false);
                setSelectedTask(null);
            }
        });

        return () => {
            pusherClient.unsubscribe(`org-${organizationId}`);
        };
    }, [organizationId, selectedTask?.id]);

    const handleCreateTask = async () => {
        if (!newTask.title || !newTask.projectId) {
            toast.error("Title and project are required");
            return;
        }
        setSavingTask(true);
        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create task");
            }
            const created = await res.json();
            setTasks([created, ...tasks]);
            setIsSlideOverOpen(false);
            setNewTask({ title: "", status: "TODO", priority: "MEDIUM", projectId: (projects && projects.length > 0) ? projects[0].id : "", tags: [] });
            toast.success("Task created");
        } catch (e: any) {
            toast.error(e.message || "Failed to create task");
        } finally {
            setSavingTask(false);
        }
    };

    /* ── Handle Query Params ── */
    useEffect(() => {
        if (searchParams.get("new") === "true") {
            setSelectedTask(null);
            setIsSlideOverOpen(true);
            // Clean up URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("new");
            router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`);
        }
    }, [searchParams, pathname, router]);

    // Filters from URL
    const query = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "all";
    const priorityFilter = searchParams.get("priority") || "all";
    const assigneeFilter = searchParams.get("assignee") || "all";
    const projectFilter = searchParams.get("project") || "all";
    const dateFilter = searchParams.get("date") || "all";

    const sortField = (searchParams.get("sort") as SortField) || "createdAt";
    const sortOrder = (searchParams.get("order") as SortOrder) || "desc";

    // URL State helper
    const updateQuery = (updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === "all") params.delete(key);
            else params.set(key, value);
        });
        router.push(`${pathname}?${params.toString()}`);
    };

    // Filter Logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false;
            if (statusFilter !== "all" && task.status !== statusFilter) return false;
            if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
            if (assigneeFilter === "me" && task.assignedToId !== currentUserId) return false;
            if (assigneeFilter !== "all" && assigneeFilter !== "me" && task.assignedToId !== assigneeFilter) return false;
            if (projectFilter !== "all" && task.projectId !== projectFilter) return false;

            if (dateFilter !== "all") {
                const d = task.dueDate ? new Date(task.dueDate) : null;
                if (!d) return false;
                if (dateFilter === "today" && !isToday(d)) return false;
                if (dateFilter === "overdue" && (!isPast(d) || isToday(d))) return false;
                if (dateFilter === "week" && !isThisWeek(d)) return false;
            }

            return true;
        }).sort((a, b) => {
            let comparison = 0;
            if (sortField === "title") comparison = a.title.localeCompare(b.title);
            else if (sortField === "dueDate") {
                const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                comparison = da - db;
            }
            else if (sortField === "priority") {
                const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                comparison = (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
            }
            else if (sortField === "status") {
                const order = { TODO: 0, IN_PROGRESS: 1, IN_REVIEW: 2, DONE: 3 };
                comparison = (order[a.status] ?? 0) - (order[b.status] ?? 0);
            }
            else comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

            return sortOrder === "asc" ? comparison : -comparison;
        });
    }, [tasks, query, statusFilter, priorityFilter, assigneeFilter, projectFilter, dateFilter, sortField, sortOrder, currentUserId]);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTasks.length) setSelectedIds([]);
        else setSelectedIds(filteredTasks.map(t => t.id));
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Bulk Actions
    const handleBulkUpdate = async (updates: Partial<Task>) => {
        setLoading(true);
        try {
            const res = await fetch("/api/tasks/bulk", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds, ...updates })
            });
            if (!res.ok) throw new Error();

            setTasks(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, ...updates } : t));
            toast.success(`Updated ${selectedIds.length} tasks`);
            setSelectedIds([]);
        } catch {
            toast.error("Failed to update tasks");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) return;
        setLoading(true);
        try {
            const res = await fetch("/api/tasks/bulk", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (!res.ok) throw new Error();

            setTasks(prev => prev.filter(t => !selectedIds.includes(t.id)));
            toast.success(`Deleted ${selectedIds.length} tasks`);
            setSelectedIds([]);
        } catch {
            toast.error("Failed to delete tasks");
        } finally {
            setLoading(false);
        }
    };

    // Inline Detail Update (Debounced or instant for simple fields)
    const updateSelectedTask = async (updates: Partial<Task>) => {
        if (!selectedTask) return;
        // Permission check
        if (!isAdmin && selectedTask.assignedToId !== currentUserId) {
            toast.error("You can only edit tasks assigned to you");
            return;
        }
        setSavingTask(true);
        try {
            const res = await fetch(`/api/tasks/${selectedTask.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to save changes");
            }
            const updated = await res.json();
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelectedTask(updated);
        } catch (e: any) {
            toast.error(e.message || "Failed to save changes");
        } finally {
            setSavingTask(false);
        }
    };

    const handleRequestAssignment = async () => {
        if (!selectedTask) return;
        setRequestingAssignment(true);
        try {
            const res = await fetch(`/api/tasks/${selectedTask.id}/request-assignment`, {
                method: "POST"
            });
            if (!res.ok) throw new Error();
            toast.success("Assignment requested successfully");
        } catch {
            toast.error("Failed to request assignment");
        } finally {
            setRequestingAssignment(false);
        }
    };

    // Can the current user edit the selected task?
    const canEditSelectedTask = isAdmin;
    const canDeleteSelectedTask = isAdmin;
    const canUpdateStatus = selectedTask ? (isAdmin || selectedTask.assignedToId === currentUserId) : false;

    return (
        <div className="space-y-6">
            <PageHeader heading="Tasks" description="Manage all your workspace tasks across projects">
                <div className="flex items-center gap-2">
                    <Badge className="bg-bg-hover border-border text-text-muted">{tasks.length} total</Badge>
                    {isAdmin && (
                        <Button
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => { setSelectedTask(null); setIsSlideOverOpen(true); }}
                        >
                            New Task
                        </Button>
                    )}
                </div>
            </PageHeader>

            {/* ── FILTER BAR ── */}
            <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 p-3 bg-surface border border-border-default rounded-2xl shadow-sm">
                <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                    <input
                        placeholder="Search tasks..."
                        value={query}
                        onChange={(e) => updateQuery({ search: e.target.value })}
                        className="w-full bg-bg-hover border border-border-default rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all"
                    />
                </div>

                <div className="flex items-center gap-1 bg-bg-hover p-1 rounded-xl">
                    {["all", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"].map(s => (
                        <button
                            key={s}
                            onClick={() => updateQuery({ status: s })}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                statusFilter === s
                                    ? "bg-bg-surface text-text-primary shadow-sm ring-1 ring-border"
                                    : "text-text-muted hover:text-text-secondary"
                            )}
                        >
                            {s === "all" ? "All" : s.replace("_", " ")}
                        </button>
                    ))}
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-9 px-3 border-border-default">
                            <Filter className="h-3.5 w-3.5 mr-2" />
                            Priority: {priorityFilter === "all" ? "All" : priorityFilter}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-surface border border-border-default w-40 rounded-2xl shadow-xl shadow-black/5">
                        <DropdownMenuItem onClick={() => updateQuery({ priority: "all" })}>All</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuery({ priority: "HIGH" })}>High</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuery({ priority: "MEDIUM" })}>Medium</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuery({ priority: "LOW" })}>Low</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-9 px-3 border-border-default">
                            <User className="h-3.5 w-3.5 mr-2" />
                            Assignee
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-surface border border-border-default w-56 max-h-64 overflow-y-auto rounded-2xl shadow-xl">
                        <DropdownMenuItem onClick={() => updateQuery({ assignee: "all" })}>All Team</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateQuery({ assignee: "me" })} className="font-bold text-accent">Assigned to me</DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border-default" />
                        {members.map(m => (
                            <DropdownMenuItem key={m.id} onClick={() => updateQuery({ assignee: m.user.id })}>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-bg-hover overflow-hidden ring-1 ring-border-default relative">
                                        {m.user.avatar ? <NextImage src={m.user.avatar} fill alt={m.user.name || "Member"} className="object-cover" /> : null}
                                    </div>
                                    <span className="font-semibold">{m.user.name}</span>
                                </div>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {(query || statusFilter !== "all" || priorityFilter !== "all" || assigneeFilter !== "all" || projectFilter !== "all" || dateFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={() => router.push(pathname)} className="text-text-muted hover:text-text-primary h-9">
                        Clear Filters
                    </Button>
                )}
            </div>

            {/* ── TABLE ── */}
            <Card className="overflow-hidden border-border-default p-0 rounded-2xl shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-bg-hover/50">
                            <TableRow className="border-border-default hover:bg-transparent">
                                <TableHead className="w-12 text-center">
                                    <Checkbox
                                        checked={selectedIds.length === filteredTasks.length && filteredTasks.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                </TableHead>
                                <TableHead className="cursor-pointer group" onClick={() => updateQuery({ sort: "title", order: sortOrder === "asc" ? "desc" : "asc" })}>
                                    <div className="flex items-center gap-1 font-bold text-text-primary">
                                        Title
                                        {sortField === "title" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </div>
                                </TableHead>
                                <TableHead className="hidden md:table-cell font-bold text-text-primary">Project</TableHead>
                                <TableHead className="hidden md:table-cell font-bold text-text-primary">Assignee</TableHead>
                                <TableHead className="hidden md:table-cell cursor-pointer font-bold text-text-primary" onClick={() => updateQuery({ sort: "priority", order: sortOrder === "asc" ? "desc" : "asc" })}>
                                    Priority
                                </TableHead>
                                <TableHead className="cursor-pointer font-bold text-text-primary" onClick={() => updateQuery({ sort: "dueDate", order: sortOrder === "asc" ? "desc" : "asc" })}>
                                    Due Date
                                </TableHead>
                                <TableHead className="cursor-pointer text-right font-bold text-text-primary" onClick={() => updateQuery({ sort: "status", order: sortOrder === "asc" ? "desc" : "asc" })}>
                                    Status
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 px-4">
                                        <EmptyState
                                            icon={<CheckCircle2 className="h-12 w-12 text-accent/10" />}
                                            title={query ? "No matching tasks" : "No tasks found"}
                                            description={query
                                                ? `We couldn't find any tasks matching "${query}"`
                                                : "All caught up! Create a new task to get started."
                                            }
                                            action={!query && (
                                                <Button
                                                    variant="primary"
                                                    icon={<Plus className="h-4 w-4" />}
                                                    onClick={() => { setSelectedTask(null); setIsSlideOverOpen(true); }}
                                                >
                                                    Create Task
                                                </Button>
                                            )}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredTasks.map((task) => (
                                    <TableRow
                                        key={task.id}
                                        className={cn(
                                            "border-border-default transition-colors group cursor-pointer",
                                            selectedIds.includes(task.id) ? "bg-accent-light" : "hover:bg-bg-hover/30"
                                        )}
                                        onClick={() => { setSelectedTask(task); setIsSlideOverOpen(true); }}
                                    >
                                        <TableCell className="w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedIds.includes(task.id)}
                                                onCheckedChange={() => toggleSelect(task.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-bold text-text-primary min-w-[200px]">
                                            {task.title}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                                                <span className="text-xs font-semibold text-text-secondary">{task.project.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {task.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-bg-hover overflow-hidden ring-1 ring-border-default relative">
                                                        {task.assignedTo.avatar ? <NextImage src={task.assignedTo.avatar} fill alt={task.assignedTo.name || "Assignee"} className="object-cover" /> : null}
                                                    </div>
                                                    <span className="text-xs font-semibold text-text-secondary">{task.assignedTo.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-text-muted opacity-60 italic font-medium">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <Badge variant={task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warning" : "success"}>
                                                {task.priority}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className={cn(
                                                "flex items-center gap-1.5 text-xs font-bold font-mono",
                                                task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE' ? "text-danger" : "text-text-muted"
                                            )}>
                                                <CalendarIcon className="h-3 w-3" />
                                                {task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={
                                                task.status === "DONE" ? "success" :
                                                    task.status === "IN_PROGRESS" ? "purple" :
                                                        task.status === "IN_REVIEW" ? "warning" : "default"
                                            }>
                                                {task.status.replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* ── BULK ACTIONS BAR ── */}
            <AnimatePresence>
                {selectedIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-3 bg-bg-surface/90 backdrop-blur-xl border border-border shadow-2xl ring-1 ring-black/5"
                    >
                        <div className="flex items-center gap-3 pr-6 border-r border-border-default">
                            <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center text-white font-extrabold shadow-lg shadow-accent/20">
                                {selectedIds.length}
                            </div>
                            <span className="text-sm font-bold text-text-primary">tasks selected</span>
                            <button onClick={() => setSelectedIds([])} className="ml-2 text-text-muted hover:text-text-primary transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-9 px-3 border-border-default" disabled={loading}>
                                        Change Status <ChevronDown className="h-3 w-3 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-surface border border-border-default w-40 rounded-2xl shadow-xl">
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ status: "TODO" })}>To Do</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ status: "IN_PROGRESS" })}>In Progress</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ status: "IN_REVIEW" })}>In Review</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ status: "DONE" })}>Done</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm" className="h-9 px-3 border-border-default" disabled={loading}>
                                        Change Priority <ChevronDown className="h-3 w-3 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-surface border border-border-default w-40 rounded-2xl shadow-xl">
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ priority: "HIGH" })}>High</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ priority: "MEDIUM" })}>Medium</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleBulkUpdate({ priority: "LOW" })}>Low</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button
                                variant="secondary"
                                size="sm"
                                className="h-9 px-3 border-border-default text-danger hover:bg-danger/10"
                                onClick={handleBulkDelete}
                                disabled={loading}
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── TASK DETAIL SLIDE-OVER ── */}
            <Sheet open={isSlideOverOpen} onOpenChange={setIsSlideOverOpen}>
                <SheetContent className="w-full sm:max-w-md bg-bg-surface border-l border-border p-0 flex flex-col shadow-2xl">
                    {selectedTask ? (
                        <>
                            <SheetHeader className="p-6 border-b border-border-default">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <input
                                            defaultValue={selectedTask.title}
                                            onBlur={(e) => {
                                                if (e.target.value !== selectedTask.title) updateSelectedTask({ title: e.target.value });
                                            }}
                                            readOnly={!canEditSelectedTask}
                                            className={cn(
                                                "w-full bg-transparent border-none p-0 text-xl heading font-extrabold text-text-primary focus:outline-none focus:ring-0 placeholder:text-text-subtle",
                                                !canEditSelectedTask && "cursor-default"
                                            )}
                                        />
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs font-bold text-text-subtle uppercase tracking-widest">in project</span>
                                            <Link href={`/dashboard/projects/${selectedTask.projectId}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-bg-hover border border-border-default hover:bg-bg-elevated transition-colors">
                                                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedTask.project.color }} />
                                                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{selectedTask.project.name}</span>
                                                <ExternalLink className="h-2.5 w-2.5 text-text-muted" />
                                            </Link>
                                            {!canEditSelectedTask && (
                                                <span className="ml-auto text-[10px] font-extrabold uppercase tracking-widest text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded-md">View Only</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Status</label>
                                        <select
                                            value={selectedTask.status}
                                            onChange={(e) => updateSelectedTask({ status: e.target.value as TaskStatus })}
                                            disabled={!canUpdateStatus}
                                            className={cn(
                                                "w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent transition-colors",
                                                !canUpdateStatus && "opacity-60 cursor-not-allowed"
                                            )}
                                        >
                                            <option value="TODO">To Do</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="IN_REVIEW">In Review</option>
                                            <option value="DONE">Done</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Priority</label>
                                        <div className="flex gap-1 p-1 bg-bg-hover rounded-lg border border-border-default">
                                            {["HIGH", "MEDIUM", "LOW"].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => canEditSelectedTask && updateSelectedTask({ priority: p as TaskPriority })}
                                                    disabled={!canEditSelectedTask}
                                                    className={cn(
                                                        "flex-1 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all",
                                                        selectedTask.priority === p
                                                            ? (p === 'HIGH' ? 'bg-danger text-white shadow-lg' : p === 'MEDIUM' ? 'bg-amber-500 text-white shadow-lg' : 'bg-emerald-500 text-white shadow-lg')
                                                            : "text-text-muted hover:text-text-secondary",
                                                        !canEditSelectedTask && "opacity-60 cursor-not-allowed"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Assignee</label>
                                        <div className="flex gap-2 items-center">
                                            <select
                                                value={selectedTask.assignedToId || "none"}
                                                onChange={(e) => updateSelectedTask({ assignedToId: e.target.value === 'none' ? null : e.target.value })}
                                                disabled={!canEditSelectedTask}
                                                className={cn(
                                                    "w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none",
                                                    !canEditSelectedTask && "opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                <option value="none">Unassigned</option>
                                                {members.map(m => (
                                                    <option key={m.id} value={m.user.id}>{m.user.name}</option>
                                                ))}
                                            </select>
                                            {!canEditSelectedTask && !selectedTask.assignedToId && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={handleRequestAssignment}
                                                    disabled={requestingAssignment}
                                                    className="shrink-0"
                                                >
                                                    {requestingAssignment ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                                    Request Assignment
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Due Date</label>
                                        <input
                                            type="date"
                                            value={selectedTask.dueDate ? selectedTask.dueDate.split('T')[0] : ""}
                                            onChange={(e) => updateSelectedTask({ dueDate: e.target.value || null })}
                                            readOnly={!canEditSelectedTask}
                                            className={cn(
                                                "w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent transition-colors",
                                                !canEditSelectedTask && "opacity-60 cursor-not-allowed"
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Tags</label>
                                    <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-bg-surface border border-border rounded-xl">
                                        {selectedTask.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent/20 text-[10px] font-extrabold text-accent-text uppercase tracking-wider">
                                                {tag}
                                                {canEditSelectedTask && (
                                                    <button onClick={() => updateSelectedTask({ tags: selectedTask.tags.filter(t => t !== tag) })} className="hover:text-accent-text/60"><X className="h-3 w-3" /></button>
                                                )}
                                            </span>
                                        ))}
                                        {canEditSelectedTask && (
                                            <input
                                                placeholder="Add tag..."
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                        const tag = e.currentTarget.value.trim().toLowerCase();
                                                        if (!selectedTask.tags.includes(tag)) {
                                                            updateSelectedTask({ tags: [...selectedTask.tags, tag] });
                                                            e.currentTarget.value = "";
                                                        }
                                                    }
                                                }}
                                                className="bg-transparent border-none text-[10px] p-0 font-bold uppercase tracking-widest focus:ring-0 w-20 placeholder:text-text-subtle"
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Description</label>
                                    <textarea
                                        defaultValue={selectedTask.description || ""}
                                        onBlur={(e) => {
                                            if (canEditSelectedTask && e.target.value !== selectedTask.description) updateSelectedTask({ description: e.target.value });
                                        }}
                                        readOnly={!canEditSelectedTask}
                                        placeholder={canEditSelectedTask ? "Add a detailed description..." : "No description"}
                                        rows={8}
                                        className={cn(
                                            "w-full bg-bg-hover border border-border-default rounded-xl p-4 text-sm font-medium text-text-primary focus:outline-none focus:border-accent transition-colors resize-none scrollbar-hide",
                                            !canEditSelectedTask && "opacity-60 cursor-not-allowed"
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-border-default bg-bg-base flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-text-muted">
                                    {savingTask ? (
                                        <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Check className="h-3 w-3" /> All changes saved</>
                                    )}
                                </div>
                                {canDeleteSelectedTask && (
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this task?")) {
                                                await fetch(`/api/tasks/${selectedTask.id}`, { method: "DELETE" });
                                                setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                                                setIsSlideOverOpen(false);
                                                toast.success("Task deleted");
                                            }
                                        }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-danger hover:underline transition-colors"
                                    >
                                        Delete Task
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <SheetHeader className="p-6 border-b border-border-default">
                                <h2 className="text-xl heading font-extrabold text-text-primary">Create New Task</h2>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Title *</label>
                                    <input
                                        placeholder="Task title..."
                                        value={newTask.title || ""}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Project *</label>
                                    <select
                                        value={newTask.projectId}
                                        onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent"
                                    >
                                        <option value="">Select a project</option>
                                        {projects && projects.length > 0 && projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Status</label>
                                        <select
                                            value={newTask.status}
                                            onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent"
                                        >
                                            <option value="TODO">To Do</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="IN_REVIEW">In Review</option>
                                            <option value="DONE">Done</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Priority</label>
                                        <div className="flex gap-1 p-1 bg-bg-hover rounded-lg border border-border-default">
                                            {["HIGH", "MEDIUM", "LOW"].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setNewTask({ ...newTask, priority: p as TaskPriority })}
                                                    className={cn(
                                                        "flex-1 py-1 text-[10px] font-extrabold uppercase rounded-md transition-all",
                                                        newTask.priority === p
                                                            ? (p === 'HIGH' ? 'bg-danger text-white shadow-lg' : p === 'MEDIUM' ? 'bg-amber-500 text-white shadow-lg' : 'bg-emerald-500 text-white shadow-lg')
                                                            : "text-text-muted hover:text-text-secondary"
                                                    )}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Assignee</label>
                                        <select
                                            value={newTask.assignedToId || "none"}
                                            onChange={(e) => setNewTask({ ...newTask, assignedToId: e.target.value === 'none' ? null : e.target.value })}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none"
                                        >
                                            <option value="none">Unassigned</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.user.id}>{m.user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Due Date</label>
                                        <input
                                            type="date"
                                            value={newTask.dueDate || ""}
                                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value || null })}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-sm font-bold text-text-primary focus:outline-none focus:border-accent"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Description</label>
                                    <textarea
                                        value={newTask.description || ""}
                                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                        placeholder="Add a detailed description..."
                                        rows={5}
                                        className="w-full bg-bg-hover border border-border-default rounded-xl p-4 text-sm font-medium text-text-primary focus:outline-none focus:border-accent resize-none scrollbar-hide"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-border-default bg-bg-base flex items-center justify-end gap-3">
                                <Button variant="ghost" onClick={() => setIsSlideOverOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreateTask} loading={savingTask}>Create Task</Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
