"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {

  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Task } from "@/types";

/* ── Priority styling ── */
const PRIORITY_BORDER: Record<string, string> = {
  HIGH: "#ef4444",
  MEDIUM: "#f59e0b",
  LOW: "#10b981",
};

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: "bg-red-500/10", text: "text-red-400", label: "High" },
  MEDIUM: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Medium" },
  LOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Low" },
};

function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDate(d: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(d));
}

interface Props {
  task: Task;
  index: number;
  onClick?: (task: Task) => void;
  onMoveTask?: (task: Task, direction: "left" | "right") => void;
  disabled?: boolean;
}

function TaskCardInner({ task, onClick, onMoveTask, disabled }: Props) {
  const overdue = task.status !== "DONE" && isOverdue(task.dueDate);
  const badge = PRIORITY_BADGE[task.priority];

  return (
    <div
      className={cn(
        "group relative rounded-lg border border-white/[0.06] bg-bg-surface transition-all duration-150 cursor-pointer overflow-hidden",
        "hover:border-white/[0.12] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
        disabled && "opacity-60 pointer-events-none"
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: PRIORITY_BORDER[task.priority],
      }}
      onClick={() => onClick?.(task)}
    >

      <div className="p-3 space-y-2">
        {/* Title */}
        <p className="text-sm font-medium text-text-primary pr-6 leading-snug">
          {task.title}
        </p>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-text-muted line-clamp-1 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Assignee */}
          {task.assignedTo && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignedTo.avatar ?? undefined} />
              <AvatarFallback className="text-[9px] bg-accent/20 text-accent-light">
                {task.assignedTo.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Due date */}
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                overdue
                  ? "bg-red-500/10 text-red-400"
                  : "bg-white/[0.04] text-text-muted"
              )}
            >
              {overdue ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Calendar className="h-3 w-3" />
              )}
              {formatDate(task.dueDate)}
            </span>
          )}

          {/* Priority */}
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium",
              badge.bg,
              badge.text
            )}
          >
            {badge.label}
          </span>
        </div>
      </div>

      {/* Action Bar / Status Controller */}
      <div className="flex items-center justify-between border-t border-white/[0.04] p-2 bg-black/20 mt-auto">
        <div className="flex items-center gap-1 bg-white/[0.03] rounded-full p-0.5 border border-white/5 shadow-sm">
          <button
            onClick={(e) => { e.stopPropagation(); onMoveTask?.(task, "left"); }}
            title="Move Left"
            className="p-1 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] font-bold text-text-secondary px-1 uppercase tracking-wider select-none">
            {task.status.replace("_", " ")}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onMoveTask?.(task, "right"); }}
            title="Move Right"
            className="p-1 rounded-full text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const TaskCard = memo(TaskCardInner);
