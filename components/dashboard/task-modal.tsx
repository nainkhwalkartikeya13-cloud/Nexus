"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar as CalendarIcon, Tag, UserPlus, X } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { TaskSubtasks } from "@/components/kanban/task-subtasks";
import { TaskComments } from "@/components/kanban/task-comments";
import { TaskAttachments } from "@/components/kanban/task-attachments";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { TaskStatus, TaskPriority } from "@prisma/client";
import toast from "react-hot-toast";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: string;
    members: { id: string; name: string; avatar: string | null }[];
    defaultStatus?: TaskStatus;
    initialData?: {
        id: string;
        title: string;
        description: string | null;
        status: TaskStatus;
        priority: TaskPriority;
        assignedToId: string | null;
        dueDate: string | null;
        tags: string[];
    };
    onSuccess: (task: {
        id: string;
        title: string;
        description: string | null;
        status: TaskStatus;
        priority: TaskPriority;
        assignedToId: string | null;
        dueDate: string | null;
        tags: string[];
    }) => void;
}

export function TaskModal({ open, onOpenChange, projectId, members, initialData, defaultStatus, onSuccess }: Props) {
    const isEdit = !!initialData?.id;

    const [title, setTitle] = useState(initialData?.title ?? "");
    const [description, setDescription] = useState(initialData?.description ?? "");
    const [status, setStatus] = useState<TaskStatus>(initialData?.status ?? defaultStatus ?? "TODO");
    const [priority, setPriority] = useState<TaskPriority>(initialData?.priority ?? "MEDIUM");
    const [assignedToId, setAssignedToId] = useState<string>(initialData?.assignedToId ?? "none");
    const [dueDate, setDueDate] = useState<string>(initialData?.dueDate ? initialData.dueDate.split('T')[0] : "");
    const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
    const [newTag, setNewTag] = useState("");

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setTitle(initialData?.title ?? "");
            setDescription(initialData?.description ?? "");
            setStatus(initialData?.status ?? defaultStatus ?? "TODO");
            setPriority(initialData?.priority ?? "MEDIUM");
            setAssignedToId(initialData?.assignedToId ?? "none");
            setDueDate(initialData?.dueDate ? initialData.dueDate.split('T')[0] : "");
            setTags(initialData?.tags ?? []);
        }
    }, [open, initialData]);

    const addTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim().toLowerCase())) {
            setTags([...tags, newTag.trim().toLowerCase()]);
            setNewTag("");
        }
    };

    const removeTag = (tag: string) => {
        setTags(tags.filter(t => t !== tag));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim() || null,
                status,
                priority,
                assignedToId: assignedToId === "none" ? null : assignedToId,
                dueDate: dueDate ? new Date(dueDate).toISOString() : null,
                tags,
                projectId
            };

            const url = isEdit ? `/api/tasks/${initialData.id}` : "/api/tasks";
            const method = isEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to save task");
            }

            const result = await res.json();
            toast.success(isEdit ? "Task updated" : "Task created");
            onSuccess(result);
            onOpenChange(false);
        } catch (error: any) {
            console.error("[TASK_MODAL_ERROR]", error);
            toast.error(error.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass border-border sm:max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="font-display text-text-primary">
                        {isEdit ? "Edit Task" : "New Task"}
                    </DialogTitle>
                    <DialogDescription className="text-text-muted">
                        {isEdit ? "Update task details and progress." : "Create a new task for this project."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4 flex-1 overflow-y-auto pr-2 scrollbar-hide">
                    {/* Title */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Task Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-accent/40 focus:outline-none transition-colors"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5 min-h-[160px]">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Description</label>
                        <RichTextEditor
                            value={description}
                            onChange={(val) => setDescription(val)}
                            placeholder="Add more details..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Status */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as TaskStatus)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                            >
                                <option value="TODO" className="bg-bg-base">To Do</option>
                                <option value="IN_PROGRESS" className="bg-bg-base">In Progress</option>
                                <option value="IN_REVIEW" className="bg-bg-base">In Review</option>
                                <option value="DONE" className="bg-bg-base">Completed</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as TaskPriority)}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                            >
                                <option value="LOW" className="bg-bg-base text-emerald-400">Low</option>
                                <option value="MEDIUM" className="bg-bg-base text-amber-400">Medium</option>
                                <option value="HIGH" className="bg-bg-base text-danger">High</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Assignee */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Assignee</label>
                            <div className="relative">
                                <select
                                    value={assignedToId}
                                    onChange={e => setAssignedToId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none appearance-none"
                                >
                                    <option value="none" className="bg-bg-base">Unassigned</option>
                                    {members.map(m => (
                                        <option key={m.id} value={m.id} className="bg-bg-base">{m.name}</option>
                                    ))}
                                </select>
                                <UserPlus className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Due Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none [color-scheme:dark]"
                                />
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(t => (
                                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] text-accent font-bold uppercase">
                                    {t}
                                    <button type="button" onClick={() => removeTag(t)} className="hover:text-white transition-colors">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    placeholder="Add a tag..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none"
                                />
                                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                            </div>
                            <Button type="button" variant="secondary" onClick={addTag} className="h-9 px-3">Add</Button>
                        </div>
                    </div>

                    {isEdit && initialData && (
                        <>
                            <div className="pt-4 border-t border-border">
                                <TaskSubtasks taskId={initialData.id} projectId={projectId} />
                            </div>
                            <div className="pt-4 mt-6 border-t border-white/10">
                                <TaskAttachments taskId={initialData.id} />
                            </div>
                            <div className="pt-4 mt-6 border-t border-white/10">
                                <TaskComments taskId={initialData.id} />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-bg-base/80 backdrop-blur-sm -mx-2 px-2 pb-2">
                        <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="text-text-muted">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !title.trim()} className="min-w-[120px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEdit ? "Save Changes" : "Create Task")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
