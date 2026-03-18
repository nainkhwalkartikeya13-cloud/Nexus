"use client";

import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { TaskStatus } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./KanbanCard";

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

interface Props {
    id: TaskStatus;
    title: string;
    color: string;
    tasks: Task[];
    projectId: string;
    onTaskClick: (task: Task) => void;
    onTaskMove: (taskId: string, direction: "left" | "right") => void;
    onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
    onTaskDelete: (taskId: string) => void;
    onAddTask: (status: TaskStatus) => void;
    canEdit?: boolean;
    currentUserId?: string;
    isAdmin?: boolean;
}

export function KanbanColumn({
    id, title, color, tasks, projectId,
    onTaskClick, onTaskMove, onTaskStatusChange, onTaskDelete, onAddTask, canEdit = true,
    currentUserId, isAdmin = false
}: Props) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <motion.div
            layout
            animate={{ width: isCollapsed ? 64 : 320 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className={cn(
                "flex flex-col h-full",
                isCollapsed ? "min-w-[64px]" : "min-w-[320px] max-md:w-[85vw] max-md:min-w-[85vw]"
            )}
        >
            {/* Column Header */}
            <div className={cn(
                "flex items-center justify-between mb-4 px-2",
                isCollapsed && "flex-col gap-4 py-4"
            )}>
                <div className={cn("flex items-center gap-2", isCollapsed && "flex-col")}>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className={cn(
                        "font-bold text-text-primary text-[11px] uppercase tracking-widest",
                        isCollapsed && "rotate-90 origin-center whitespace-nowrap mt-8"
                    )}>
                        {title}
                    </h3>
                    <motion.span
                        key={tasks.length}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-[10px] font-bold text-text-muted bg-bg-hover border border-border px-2 py-0.5 rounded-full"
                    >
                        {tasks.length}
                    </motion.span>
                </div>

                <div className={cn("flex items-center gap-1", isCollapsed && "flex-col")}>
                    {!isCollapsed && (
                        <button
                            className="p-1 hover:bg-bg-hover rounded-md text-text-muted hover:text-text-primary transition-colors"
                            onClick={() => setIsCollapsed(true)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                    )}
                    {isCollapsed && (
                        <button
                            className="p-1 hover:bg-bg-hover rounded-md text-text-muted hover:text-text-primary transition-colors"
                            onClick={() => setIsCollapsed(false)}
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Droppable Area */}
            {!isCollapsed && (
                <Droppable droppableId={id}>
                    {(provided, snapshot) => (
                        <div
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            className={cn(
                                "flex-1 min-h-[500px] rounded-2xl p-2 transition-all duration-300 border-2",
                                snapshot.isDraggingOver
                                    ? "bg-accent/5 border-dashed border-accent/40 shadow-[inset_0_0_30px_rgba(99,102,241,0.15)] ring-1 ring-inset ring-accent/20"
                                    : "bg-transparent border-transparent"
                            )}
                        >
                            <div className="space-y-3">
                                {tasks.map((task, index) => {
                                    const canMoveThisTask = isAdmin || task.assignedToId === currentUserId;
                                    return (
                                        <KanbanCard
                                            key={task.id}
                                            task={task}
                                            index={index}
                                            onClick={() => onTaskClick(task)}
                                            onMove={canMoveThisTask ? onTaskMove : () => { }}
                                            onStatusChange={canMoveThisTask ? onTaskStatusChange : () => { }}
                                            onDelete={isAdmin ? onTaskDelete : () => { }}
                                            isDragDisabled={!canMoveThisTask}
                                        />
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                            {/* Unified Add Task Button - only visible if has edit permission */}
                            {canEdit && (
                                <motion.button
                                    whileHover={{ x: 4 }}
                                    onClick={() => onAddTask(id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 mt-2 text-sm font-medium text-text-muted hover:text-accent transition-colors group"
                                >
                                    <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
                                    <span>Add task</span>
                                </motion.button>
                            )}

                            {/* Keyboard Hint */}
                            <p className="mt-4 text-[11px] text-text-muted/40 text-center italic">
                                Tip: Use arrow keys to move tasks
                            </p>
                        </div>
                    )}
                </Droppable>
            )}
        </motion.div>
    );
}
