"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, LayoutGrid } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { ProjectCard, type ProjectCardData } from "@/components/dashboard/project-card";
import { ProjectModal } from "@/components/dashboard/project-modal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/shared/Badge";
import { PresenceAvatars } from "@/components/shared/PresenceAvatars";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
    initialProjects: ProjectCardData[];
}

export function ProjectsClient({ initialProjects }: Props) {
    const [projects, setProjects] = useState(initialProjects);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editData, setEditData] = useState<ProjectCardData | undefined>(undefined);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    /* ── Handle Query Params ── */
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("new") === "true") {
            setEditData(undefined);
            setIsModalOpen(true);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    /* ── Filtered Projects ── */
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.description?.toLowerCase().includes(search.toLowerCase());

            if (filter === "completed") return matchesSearch && p.doneCount === p.taskCount && p.taskCount > 0;
            if (filter === "active") return matchesSearch && p.doneCount < p.taskCount;
            return matchesSearch;
        });
    }, [projects, search, filter]);

    /* ── CRUD Handlers ── */
    const handleDelete = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/projects/${projectToDelete}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete project");

            setProjects(prev => prev.filter(p => p.id !== projectToDelete));
            toast.success("Project deleted successfully");
            setIsDeleteOpen(false);
        } catch {
            toast.error("Error deleting project");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">Projects</h1>
                        <Badge className="bg-accent/10 text-accent border-accent/20">
                            {projects.length}
                        </Badge>
                    </div>
                    <p className="text-text-muted mt-1">Manage and track your workspace initiatives</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Active Now</span>
                        <PresenceAvatars pageId="projects-index" />
                    </div>
                    <Button
                        icon={<Plus className="h-4 w-4" />}
                        onClick={() => {
                            setEditData(undefined);
                            setIsModalOpen(true);
                        }}
                    >
                        New Project
                    </Button>
                </div>
            </div>

            {/* ── FILTER BAR ── */}
            <Card className="p-2 flex flex-col sm:flex-row gap-4 items-center justify-between bg-bg-surface border-border">
                <div className="flex items-center bg-bg-hover rounded-lg px-3 py-2 w-full sm:max-w-xs border border-border focus-within:border-accent/30 transition-colors">
                    <Search className="h-4 w-4 text-text-muted mr-2" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-muted/50"
                    />
                </div>

                <div className="flex items-center gap-1 bg-bg-hover p-1 rounded-lg self-stretch sm:self-auto border border-border">
                    {(["all", "active", "completed"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all",
                                filter === f
                                    ? "bg-accent text-white shadow-glow"
                                    : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </Card>

            {/* ── GRID ── */}
            {filteredProjects.length === 0 ? (
                <EmptyState
                    icon={<LayoutGrid className="h-12 w-12 text-accent/20" />}
                    title={search ? "No matches found" : "No projects yet"}
                    description={search
                        ? `We couldn't find any projects matching "${search}"`
                        : "Start your journey by creating your first organizational project."
                    }
                    action={!search && (
                        <Button
                            variant="primary"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            Create Project
                        </Button>
                    )}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProjects.map((project, i) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            index={i}
                            onEdit={() => {
                                setEditData(project);
                                setIsModalOpen(true);
                            }}
                            onDelete={() => {
                                setProjectToDelete(project.id);
                                setIsDeleteOpen(true);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* ── MODALS ── */}
            <ProjectModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                initialData={editData}
                onSuccess={(updated) => {
                    if (editData) {
                        setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                    } else {
                        // Since the API returns the full project (mostly), we'd usually refetch or add.
                        // For now, let's just add it optimistically or refetch.
                        window.location.reload(); // Simple approach for now to ensure all counts/members are right
                    }
                }}
            />

            <ConfirmModal
                open={isDeleteOpen}
                title="Delete Project?"
                description="All tasks within this project will be permanently removed. This action cannot be undone."
                onConfirm={handleDelete}
                onCancel={() => setIsDeleteOpen(false)}
                loading={isDeleting}
            />
        </div>
    );
}
