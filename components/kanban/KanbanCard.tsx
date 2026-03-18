"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";
import { Clock, GripVertical, Check } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
    assignedToId: string | null;
    assignedTo: { id: string; name: string | null; avatar: string | null } | null;
    tags: string[];
}

interface Props {
    task: Task;
    index: number;
    onClick: () => void;
    onMove: (taskId: string, direction: "left" | "right") => void;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onDelete: (taskId: string) => void;
    isDragDisabled?: boolean;
}

export function KanbanCard({ task, index, onClick, onMove, onStatusChange, onDelete, isDragDisabled = false }: Props) {
    const [isCelebrated, setIsCelebrated] = useState(false);
    const prevStatus = useRef(task.status);

    useEffect(() => {
        if (task.status === "DONE" && prevStatus.current !== "DONE") {
            setIsCelebrated(true);
            setTimeout(() => setIsCelebrated(false), 2000);
        }
        prevStatus.current = task.status;
    }, [task.status]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isDragDisabled) {
            if (e.key === "e" || e.key === "E") onClick();
            return;
        }
        switch (e.key) {
            case "ArrowRight":
                onMove(task.id, "right");
                break;
            case "ArrowLeft":
                onMove(task.id, "left");
                break;
            case "e":
            case "E":
                onClick();
                break;
            case "d":
            case "D":
                onStatusChange(task.id, "DONE");
                break;
            case "Delete":
            case "Backspace":
                onDelete(task.id);
                break;
        }
    };

    return (
        <Draggable draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="outline-none"
                    onKeyDown={handleKeyDown}
                    tabIndex={0}
                    onClick={onClick}
                    style={{
                        ...provided.draggableProps.style,
                        cursor: isDragDisabled ? "default" : snapshot.isDragging ? "grabbing" : "grab",
                    }}
                >
                    <div
                        className={cn(
                            "group relative p-4 bg-bg-surface border border-border rounded-2xl shadow-sm transition-all duration-200 overflow-hidden",
                            !snapshot.isDragging && "hover:border-accent/40 hover:-translate-y-1 hover:shadow-lg",
                            snapshot.isDragging && "border-accent border-[1.5px] shadow-[0_20px_50px_-12px_rgba(99,102,241,0.4)] rotate-[2deg] scale-[1.03]",
                            isCelebrated && "ring-2 ring-emerald-500/50 animate-pulse"
                        )}
                    >
                        {/* Priority Indicator Bar */}
                        <div
                            className={cn(
                                "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl",
                                task.priority === "HIGH" ? "bg-red-500" :
                                    task.priority === "MEDIUM" ? "bg-amber-400" : "bg-emerald-400"
                            )}
                        />

                        {/* Drag Handle Icon */}
                        {!isDragDisabled && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary">
                                <GripVertical className="h-4 w-4" />
                            </div>
                        )}

                        <div className="flex items-start justify-between gap-3 mb-2 pl-2">
                            <h4 className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors leading-snug">
                                {task.title}
                            </h4>
                        </div>

                        {task.description && (
                            <p className="text-xs text-text-muted line-clamp-2 mb-3 leading-relaxed pl-2">
                                {task.description}
                            </p>
                        )}

                        <div className="flex items-center justify-between pl-2">
                            <div className="flex items-center gap-3">
                                {task.dueDate && (
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight",
                                        isPast(new Date(task.dueDate)) && task.status !== "DONE" ? "text-red-500" : "text-text-secondary"
                                    )}>
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(task.dueDate), "MMM d")}
                                    </div>
                                )}
                            </div>

                            {task.assignedTo && (
                                <div className="h-6 w-6 rounded-full border border-border mt-0.5 overflow-hidden bg-bg-hover flex items-center justify-center shrink-0 relative shadow-sm">
                                    {task.assignedTo.avatar ? (
                                        <NextImage
                                            src={task.assignedTo.avatar}
                                            alt={task.assignedTo.name || "Assignee"}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <span className="text-[10px] font-extrabold text-text-muted">
                                            {task.assignedTo.name?.[0]?.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Celebration Effect */}
                        {isCelebrated && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                <div className="text-2xl animate-bounce">✅</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Draggable>
    );
}
