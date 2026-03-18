"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
import { Plus } from "lucide-react";

import { TaskCard } from "@/components/kanban/task-card";
import { useKanbanStore, type KanbanColumn } from "@/store/index";
import type { Task, TaskStatus, User } from "@/types";
import { moveTaskAction } from "@/app/(dashboard)/dashboard/projects/[id]/actions";

interface Props {
  project: {
    id: string;
    tasks: Task[];
  };
  members?: { user: User }[];
  onAddTask?: (status: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({ project, onAddTask = () => { }, onTaskClick }: Props) {
  const { columns, moveTask, initFromTasks } = useKanbanStore();

  const lastTasksRef = useRef<string>("");

  useEffect(() => {
    const incoming = project.tasks.map(t => t.id + t.status + t.position).join(",");
    if (incoming !== lastTasksRef.current) {
      lastTasksRef.current = incoming;
      initFromTasks(project.tasks);
    }
  }, [project.tasks, initFromTasks]);

  const COLUMNS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  const [isPending, startTransition] = useTransition();

  const handleMoveTask = useCallback((task: Task, direction: "left" | "right") => {
    const currentIndex = COLUMNS.indexOf(task.status);
    const newIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0 || newIndex >= COLUMNS.length) return;
    const newStatus = COLUMNS[newIndex];

    // Optimistic update
    moveTask(task.id, task.status, newStatus, 0);

    startTransition(async () => {
      try {
        await moveTaskAction(task.id, newStatus, 0, project.id);
      } catch (err) {
        console.error("Move failed:", err);
        moveTask(task.id, newStatus, task.status, task.position); // Rollback
      }
    });
  }, [moveTask, project.id, COLUMNS]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {columns.map((col) => (
        <Column
          key={col.id}
          column={col}
          onAddTask={() => onAddTask(col.id)}
          onTaskClick={onTaskClick}
          onMoveTask={handleMoveTask}
          isPending={isPending}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   Single Kanban Column
   ═══════════════════════════════════════ */

function Column({
  column,
  onAddTask,
  onTaskClick,
  onMoveTask,
  isPending,
}: {
  column: KanbanColumn;
  onAddTask: () => void;
  onTaskClick?: (task: Task) => void;
  onMoveTask?: (task: Task, direction: "left" | "right") => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-bg-elevated/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold text-text-primary">
            {column.title}
          </h3>
          <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-bg-surface/10 px-1.5 text-[10px] font-medium text-text-muted">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Tasks area */}
      <div className="flex-1 overflow-y-auto space-y-2 p-3 min-h-[200px] transition-colors duration-200">
        {column.tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            onClick={onTaskClick}
            onMoveTask={onMoveTask}
            disabled={isPending}
          />
        ))}

        {/* Empty state */}
        {column.tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-xs text-text-muted/60">No tasks yet</p>
            <button
              onClick={onAddTask}
              className="mt-2 text-xs text-accent hover:text-accent-light transition-colors"
            >
              + Add a task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
