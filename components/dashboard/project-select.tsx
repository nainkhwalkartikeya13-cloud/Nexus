"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
    id: string;
    name: string;
    emoji: string;
    color: string;
}

interface ProjectSelectProps {
    value: string | null;
    onChange: (id: string | null) => void;
    placeholder?: string;
}

export function ProjectSelect({ value, onChange, placeholder = "Select Project" }: ProjectSelectProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/projects")
            .then((r) => r.json())
            .then((data) => {
                if (Array.isArray(data)) setProjects(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const selectedProject = projects.find((p) => p.id === value);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center justify-between px-4 py-3 bg-bg-base border border-border rounded-xl text-sm font-medium transition-all hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-accent/30 min-w-[200px]",
                        !selectedProject && "text-text-subtle"
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {selectedProject ? (
                            <>
                                <span className="shrink-0">{selectedProject.emoji}</span>
                                <span className="truncate">{selectedProject.name}</span>
                            </>
                        ) : (
                            <>
                                <FolderKanban className="h-4 w-4 shrink-0" />
                                <span className="truncate">{placeholder}</span>
                            </>
                        )
                        }
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 ml-2 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px] glass border-border mt-1 p-1 shadow-xl" align="start">
                <DropdownMenuItem
                    className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                    onClick={() => onChange(null)}
                >
                    <div className="h-6 w-6 rounded-md bg-bg-hover flex items-center justify-center shrink-0 border border-border/50 text-[10px]">
                        ✖
                    </div>
                    <span className="text-sm">No Project</span>
                    {value === null && <Check className="h-3.5 w-3.5 ml-auto" />}
                </DropdownMenuItem>

                {loading ? (
                    <div className="p-4 text-center text-xs text-text-muted animate-pulse">Loading...</div>
                ) : projects.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-muted">No projects found</div>
                ) : (
                    projects.map((project) => (
                        <DropdownMenuItem
                            key={project.id}
                            className={cn(
                                "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors mt-0.5",
                                project.id === value
                                    ? "bg-accent/10 text-accent font-bold"
                                    : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                            )}
                            onClick={() => onChange(project.id)}
                        >
                            <div
                                className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 border border-border/50 text-xs shadow-inner"
                                style={{ backgroundColor: project.id === value ? 'transparent' : project.color + '20' }}
                            >
                                {project.emoji}
                            </div>
                            <span className="text-sm truncate">{project.name}</span>
                            {project.id === value && <Check className="h-3.5 w-3.5 ml-auto text-accent" />}
                        </DropdownMenuItem>
                    )
                    ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
