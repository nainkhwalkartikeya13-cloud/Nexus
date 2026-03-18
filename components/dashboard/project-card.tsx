"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AvatarStack } from "@/components/shared/AvatarStack";
import { MoreVertical, Pencil, Trash2, CheckCircle2, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  emoji: string;
  taskCount: number;
  doneCount: number;
  members: {
    name: string;
    image: string | null;
  }[];
  updatedAt: string;
}

interface Props {
  project: ProjectCardData;
  index: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, index, onEdit, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);
  const pct =
    project.taskCount > 0
      ? Math.round((project.doneCount / project.taskCount) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
    >
      <div
        className="group relative overflow-hidden rounded-xl border border-border bg-bg-surface hover:bg-bg-hover transition-all duration-300"
        style={{
          background: hovered
            ? `radial-gradient(circle at top left, ${project.color}15, var(--bg-surface))`
            : "var(--bg-surface)",
          borderColor: hovered
            ? `${project.color}50`
            : "var(--border)",
          transform: hovered ? "translateY(-6px)" : "translateY(0)",
          boxShadow: hovered
            ? `0 20px 40px -12px ${project.color}30, 0 0 0 1px ${project.color}20`
            : "var(--shadow-md)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Link href={`/dashboard/projects/${project.id}`} className="absolute inset-x-0 top-0 bottom-10 z-0" />

        {/* Top colored accent bar with glow */}
        <div
          className="h-1 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)]"
          style={{
            backgroundColor: project.color,
            boxShadow: hovered ? `0 0 15px ${project.color}60` : "none"
          }}
        />

        <div className="p-5 space-y-4 relative z-10 pointer-events-none">
          {/* Emoji + Name + Action Menu */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg shadow-inner"
                style={{ backgroundColor: `${project.color}20`, border: `1px solid ${project.color}30` }}
              >
                {project.emoji}
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-text-primary truncate tracking-tight">
                  {project.name}
                </h3>
              </div>
            </div>

            <div className="pointer-events-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32 glass border-border">
                  <DropdownMenuItem onClick={onEdit} className="text-xs font-semibold cursor-pointer">
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-xs font-semibold text-danger focus:bg-danger/10 focus:text-danger cursor-pointer">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed h-8 font-medium">
              {project.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-text-muted font-bold tracking-wide uppercase opacity-90">Progress</span>
              <span className="font-extrabold" style={{ color: project.color }}>
                {pct}%
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-hover shadow-inner border border-border/50">
              <motion.div
                className="h-full rounded-full"
                style={{
                  backgroundColor: project.color,
                  boxShadow: `0 0 10px ${project.color}40`
                }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1, ease: [0.23, 1, 0.32, 1], delay: index * 0.06 + 0.2 }}
              />
            </div>
          </div>

          {/* Task count + members */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: project.color }} />
              <span>
                {project.doneCount}/{project.taskCount} tasks
              </span>
            </div>

            {project.members.length > 0 && (
              <AvatarStack
                avatars={project.members}
                size="sm"
                max={3}
              />
            )}
          </div>
        </div>

        {/* Hover overlay: "Open Project →" */}
        <Link href={`/dashboard/projects/${project.id}`} className="absolute inset-x-0 bottom-0 pointer-events-auto">
          <div
            className={cn(
              "flex items-center justify-center gap-1.5 py-3 text-xs font-black transition-all duration-300",
              hovered
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-0"
            )}
            style={{
              background: `linear-gradient(to top, ${project.color}30, transparent)`,
              color: "white",
              textShadow: `0 0 10px ${project.color}aa`
            }}
          >
            Open Project <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>
    </motion.div>
  );
}
