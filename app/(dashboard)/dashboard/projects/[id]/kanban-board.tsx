"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { Button } from "@/components/shared/Button";
import { TaskModal } from "@/components/dashboard/task-modal";
import toast from "react-hot-toast";
import { pusherClient } from "@/lib/pusher-client";
import { useSession } from "next-auth/react";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";

const COLUMNS = [
    { id: "TODO", title: "To Do", color: "#64748b" },
    { id: "IN_PROGRESS", title: "In Progress", color: "#6366f1" },
    { id: "IN_REVIEW", title: "In Review", color: "#f59e0b" },
    { id: "DONE", title: "Completed", color: "#10b981" },
] as const;

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: any;
    dueDate: string | null;
    assignedToId: string | null;
    assignedTo: { id: string; name: string | null; avatar: string | null } | null;
    tags: string[];
}

export interface KanbanProject {
    id: string;
    name: string;
    description: string | null;
    emoji: string;
    color: string;
    tasks: Task[];
    members: any[];
    createdAt: string;
    updatedAt: string;
}

export function KanbanBoard({ project }: { project: KanbanProject }) {
    const [tasks, setTasks] = useState<Task[]>(project.tasks);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editTaskData, setEditTaskData] = useState<Task | undefined>(undefined);
    const [defaultNewTaskStatus, setDefaultNewTaskStatus] = useState<TaskStatus>("TODO");
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;
    const orgId = session?.user?.organizationId;

    const isOrgAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
    const currentMember = project.members.find(m => m.id === currentUserId);
    const isProjectAdmin = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";
    const canEdit = isOrgAdmin || isProjectAdmin;

    // Members only see their own assigned tasks; Admins/Owners see all
    const visibleTasks = useMemo(() => {
        if (canEdit) return tasks;
        return tasks.filter(t => t.assignedToId === currentUserId);
    }, [tasks, canEdit, currentUserId]);

    // Real-time updates from other users via Pusher
    useEffect(() => {
        if (!orgId || !pusherClient) return;
        const channel = pusherClient.subscribe(`org-${orgId}`);

        channel.bind("task-moved", (data: any) => {
            // Update anyone ELSE's move in real-time (our own moves are handled locally)
            if (data.userId !== currentUserId) {
                setTasks(prev => prev.map(t =>
                    t.id === data.taskId ? { ...t, status: data.newStatus } : t
                ));
                toast(`${data.movedBy} moved a task`, { icon: "🔄" });
            }
        });

        channel.bind("task-updated", (updatedTask: any) => {
            if (updatedTask.projectId === project.id) {
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
            }
        });

        channel.bind("task-created", (newTask: any) => {
            if (newTask.projectId === project.id) {
                setTasks(prev => {
                    if (prev.find(t => t.id === newTask.id)) return prev;
                    return [newTask, ...prev];
                });
            }
        });

        channel.bind("task-deleted", ({ taskId }: { taskId: string }) => {
            setTasks(prev => prev.filter(t => t.id !== taskId));
        });

        return () => {
            pusherClient?.unsubscribe(`org-${orgId}`);
        };
    }, [orgId, currentUserId, project.id]);

    const moveTaskOnServer = async (taskId: string, newStatus: TaskStatus, position: number | undefined, oldStatus: TaskStatus) => {
        console.log(`[KANBAN] Moving task ${taskId}: ${oldStatus} → ${newStatus} at pos ${position}`);
        try {
            const res = await fetch(`/api/tasks/${taskId}/move`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus, ...(position !== undefined && { position }) }),
            });

            console.log(`[KANBAN] Move response: ${res.status}`);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                console.error(`[KANBAN] Move failed:`, data);
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
                toast.error(data.error || "Failed to move task");
                return false;
            }

            const data = await res.json();
            console.log(`[KANBAN] Move success, server status: ${data.status}`);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...data } : t));
            return true;
        } catch (err) {
            console.error(`[KANBAN] Move network error:`, err);
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: oldStatus } : t));
            toast.error("Network error — task not saved");
            return false;
        }
    };

    const handleMoveTask = async (taskId: string, direction: "left" | "right") => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (!canEdit && task.assignedToId !== currentUserId) {
            toast.error("You can only move tasks assigned to you");
            return;
        }

        const currentIndex = COLUMNS.findIndex(c => c.id === task.status);
        const nextIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;

        const newStatus = COLUMNS[nextIndex].id as TaskStatus;
        const oldStatus = task.status;

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        await moveTaskOnServer(taskId, newStatus, undefined, oldStatus);
    };

    const handleStatusChange = async (taskId: string, status: TaskStatus) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const oldStatus = task.status;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));

        await moveTaskOnServer(taskId, status, undefined, oldStatus);
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
            if (!res.ok) {
                toast.error("Failed to delete task");
            } else {
                toast.success("Task deleted");
            }
        } catch {
            toast.error("Network error — task not deleted");
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const task = tasks.find(t => t.id === draggableId);
        if (!task) return;

        if (!canEdit && task.assignedToId !== currentUserId) {
            toast.error("You can only move tasks assigned to you");
            return;
        }

        const oldStatus = task.status;
        const newStatus = destination.droppableId as TaskStatus;
        const destIndex = destination.index;

        // Optimistic update immediately with array splicing to maintain exact visual order
        setTasks(prev => {
            const arr = [...prev];
            const oldIndexObj = arr.findIndex(t => t.id === draggableId);
            if (oldIndexObj === -1) return prev;

            const [movedTask] = arr.splice(oldIndexObj, 1);
            movedTask.status = newStatus;

            const columnTasks = arr.filter(t => t.status === newStatus);
            if (destIndex >= columnTasks.length) {
                arr.push(movedTask);
            } else {
                const targetTask = columnTasks[destIndex];
                const insertIndex = arr.findIndex(t => t.id === targetTask.id);
                arr.splice(insertIndex, 0, movedTask);
            }
            return arr;
        });

        const success = await moveTaskOnServer(draggableId, newStatus, destIndex, oldStatus);

        if (success) {
            if (newStatus === "DONE" && oldStatus !== "DONE") {
                setTimeout(() => toast.success("✓ Task completed!", { duration: 3000 }), 300);
            } else {
                toast.success("Task moved");
            }
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0">
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 pb-8">
                    <div className="flex gap-6 h-full min-w-max px-4">
                        {COLUMNS.map((col) => (
                            <KanbanColumn
                                key={col.id}
                                id={col.id as TaskStatus}
                                title={col.title}
                                color={col.color}
                                projectId={project.id}
                                tasks={visibleTasks.filter(t => t.status === col.id)}
                                onTaskClick={(task) => {
                                    setEditTaskData(task);
                                    setIsTaskModalOpen(true);
                                }}
                                onTaskMove={handleMoveTask}
                                onTaskStatusChange={handleStatusChange}
                                onTaskDelete={handleDeleteTask}
                                onAddTask={(status) => {
                                    setEditTaskData(undefined);
                                    setDefaultNewTaskStatus(status);
                                    setIsTaskModalOpen(true);
                                }}
                                canEdit={canEdit}
                                currentUserId={currentUserId}
                                isAdmin={canEdit}
                            />
                        ))}
                    </div>
                </div>
            </DragDropContext>

            <TaskModal
                open={isTaskModalOpen}
                onOpenChange={setIsTaskModalOpen}
                projectId={project.id}
                members={project.members}
                initialData={editTaskData}
                defaultStatus={defaultNewTaskStatus}
                onSuccess={(newTask) => {
                    if (editTaskData) {
                        setTasks(prev => prev.map(t => t.id === newTask.id ? newTask as any : t));
                    } else {
                        setTasks(prev => [newTask as any, ...prev]);
                    }
                }}
            />
        </div>
    );
}
