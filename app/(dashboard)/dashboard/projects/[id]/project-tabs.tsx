"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Task } from "@/types";
import { DocNavigator } from "@/components/docs/DocNavigator";
import type { Document } from "@/types";
import { cn } from "@/lib/utils";
import { LayoutGrid, FileText, Users, Plus, Shield, ShieldAlert, Trash2, ChevronLeft, Pencil, X, Check, Clock, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Link from "next/link";
import { AvatarStack } from "@/components/shared/AvatarStack";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";

const KanbanBoard = dynamic(() => import("@/components/kanban/kanban-board").then((m) => m.KanbanBoard), { ssr: false });
const ProjectTime = dynamic(() => import("./project-time").then((m) => m.ProjectTime), { ssr: false });
import { ProjectActivity } from "./project-activity";

type Tab = "tasks" | "docs" | "members" | "time" | "activity";

export interface KanbanProject {
    id: string;
    name: string;
    description: string | null;
    emoji: string;
    color: string;
    tasks: Task[];
    members: any[];
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface ProjectTabsProps {
    project: KanbanProject;
    activityLogs?: any[];
}

export function ProjectTabs({ project, activityLogs = [] }: ProjectTabsProps) {
    const [activeTab, setActiveTab] = useState<Tab>("tasks");
    const [docs, setDocs] = useState<Document[]>([]);
    const [docsLoaded, setDocsLoaded] = useState(false);

    // Member State
    const [members, setMembers] = useState(project.members);
    const [availableToInvite, setAvailableToInvite] = useState<any[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    // Edit Project State
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(project.name);
    const [editDesc, setEditDesc] = useState(project.description || "");
    const [editEmoji, setEditEmoji] = useState(project.emoji);
    const [editSaving, setEditSaving] = useState(false);
    const [projectData, setProjectData] = useState({ name: project.name, description: project.description, emoji: project.emoji });

    const { data: session } = useSession();
    const router = useRouter();

    const currentUserId = session?.user?.id;
    const currentUserRole = members.find(m => m.id === currentUserId)?.role;

    // RBAC
    const isOrgAdmin = session?.user?.role === "OWNER" || session?.user?.role === "ADMIN";
    const canEdit = isOrgAdmin || currentUserRole === "OWNER" || currentUserRole === "ADMIN";

    const loadDocs = async () => {
        if (docsLoaded) return;
        const res = await fetch(`/api/documents?projectId=${project.id}`);
        if (res.ok) {
            const data = await res.json();
            setDocs(data);
        }
        setDocsLoaded(true);
    };

    const handleTabChange = (tab: Tab) => {
        setActiveTab(tab);
        if (tab === "docs") loadDocs();
    };

    const handleNewDoc = async () => {
        const res = await fetch("/api/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: project.id }),
        });
        if (res.ok) {
            const doc = await res.json();
            setDocs((prev) => [doc, ...prev]);
            router.push(`/dashboard/docs/${doc.id}`);
        }
    };

    const loadAvailableMembers = async () => {
        try {
            const res = await fetch(`/api/projects/${project.id}/members/available`);
            if (res.ok) setAvailableToInvite(await res.json());
        } catch (error) {
            toast.error("Failed to load available members");
        }
    };

    const handleAddMember = async (userId: string) => {
        try {
            const res = await fetch(`/api/projects/${project.id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                const data = await res.json();
                // Add new member to local state with proper shape
                setMembers(prev => [...prev, {
                    id: data.user.id,
                    name: data.user.name || "User",
                    avatar: data.user.avatar,
                    role: data.role || "MEMBER"
                }]);
                // Remove from available list
                setAvailableToInvite(prev => prev.filter(m => m.userId !== userId));
                toast.success("Member added successfully!");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add member");
            }
        } catch (error) {
            toast.error("Error adding member");
        }
    };

    const handleChangeRole = async (userId: string, targetRole: string) => {
        try {
            const res = await fetch(`/api/projects/${project.id}/members`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role: targetRole }),
            });
            if (res.ok) {
                toast.success("Role updated");
                setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: targetRole } : m));
                router.refresh();
            } else {
                toast.error("Failed to update role");
            }
        } catch (error) {
            toast.error("Error updating role");
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            const res = await fetch(`/api/projects/${project.id}/members`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                toast.success("Member removed");
                setMembers(prev => prev.filter(m => m.id !== userId));
                router.refresh();
            } else {
                toast.error("Failed to remove member");
            }
        } catch (error) {
            toast.error("Error removing member");
        }
    };

    const handleEditProject = async () => {
        setEditSaving(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName, description: editDesc, emoji: editEmoji }),
            });
            if (res.ok) {
                setProjectData({ name: editName, description: editDesc, emoji: editEmoji });
                setIsEditing(false);
                toast.success("Project updated!");
                router.refresh();
            } else {
                toast.error("Failed to update project");
            }
        } catch (error) {
            toast.error("Error updating project");
        } finally {
            setEditSaving(false);
        }
    };

    const handleAddMemberClick = () => {
        setActiveTab("members");
        setIsInviting(true);
        loadAvailableMembers();
    };

    const tabs = [
        { id: "tasks" as Tab, label: "Tasks", icon: LayoutGrid },
        { id: "docs" as Tab, label: "Docs", icon: FileText },
        { id: "members" as Tab, label: "Members", icon: Users },
        { id: "time" as Tab, label: "Time", icon: Clock },
        { id: "activity" as Tab, label: "Activity", icon: Activity },
    ];

    return (
        <div className="flex flex-col h-full">
            {/* Project Header */}
            <div className="px-8 pt-6 pb-4 space-y-5 shrink-0">
                <Link href="/dashboard/projects" className="inline-flex items-center text-sm font-bold text-text-muted hover:text-text-primary transition-colors">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to projects
                </Link>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <span className="text-4xl filter drop-shadow-md">{projectData.emoji}</span>
                        <div>
                            <h1 className="text-3xl heading font-extrabold text-text-primary tracking-tight">{projectData.name}</h1>
                            <p className="text-text-secondary mt-1 max-w-xl font-medium">{projectData.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <AvatarStack avatars={members} max={4} size="md" />
                        {canEdit && (
                            <>
                                <div className="h-8 w-px bg-white/10 mx-2" />
                                <Button onClick={handleAddMemberClick} variant="secondary" size="sm" icon={<Users className="h-4 w-4" />}>Add Member</Button>
                                <Button onClick={() => { setIsEditing(true); setEditName(projectData.name); setEditDesc(projectData.description || ""); setEditEmoji(projectData.emoji); }} variant="secondary" size="sm" icon={<Pencil className="h-4 w-4" />}>Edit</Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="border-b border-white/[0.06] px-6 flex items-center gap-1 shrink-0">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                            activeTab === tab.id
                                ? "text-white"
                                : "text-text-muted hover:text-text-secondary"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="project-tab-indicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 35 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-visible">
                {activeTab === "tasks" && (
                    <KanbanBoard project={project} />
                )}

                {activeTab === "docs" && (
                    <div className="flex h-full">
                        <aside className="w-60 shrink-0 border-r border-white/[0.06] p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-text-primary">Project Docs</h3>
                                <button
                                    onClick={handleNewDoc}
                                    className="p-1 rounded-md text-text-muted hover:text-white hover:bg-white/5 transition-colors"
                                    title="New doc"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <DocNavigator
                                documents={docs}
                                projectId={project.id}
                                onNewDoc={handleNewDoc}
                                onDeleteDoc={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
                                onPinDoc={(id, pinned) => setDocs((prev) => prev.map((d) => d.id === id ? { ...d, isPinned: pinned } : d))}
                            />
                        </aside>
                        <main className="flex-1 flex flex-col items-center justify-center p-8">
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center max-w-sm"
                            >
                                <div className="text-5xl mb-4">📋</div>
                                <h3 className="text-lg font-bold text-text-primary mb-2">No doc selected</h3>
                                <p className="text-sm text-text-muted mb-5">
                                    Create meeting notes, project briefs, or any team documentation
                                </p>
                                <button
                                    onClick={handleNewDoc}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-btn text-sm font-medium transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Doc
                                </button>
                            </motion.div>
                        </main>
                    </div>
                )}

                {activeTab === "members" && (
                    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto scrollbar-thin">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">Project Members</h3>
                                <p className="text-sm text-text-muted mt-1">Manage who has access to this project.</p>
                            </div>
                            {(currentUserRole === "OWNER" || currentUserRole === "ADMIN" || isOrgAdmin) && (
                                <button
                                    onClick={() => { setIsInviting(!isInviting); if (!isInviting) loadAvailableMembers(); }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-btn text-sm font-bold shadow-primary transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Member
                                </button>
                            )}
                        </div>

                        <AnimatePresence>
                            {isInviting && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 glass border border-white/[0.08] rounded-xl shadow-lg">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Invite from Organization</h4>
                                            <button onClick={() => setIsInviting(false)} className="text-xs text-text-subtle hover:text-text-primary px-2 py-1 rounded-md hover:bg-white/5 transition-colors">Close</button>
                                        </div>

                                        <div className="space-y-3">
                                            {availableToInvite.length === 0 ? (
                                                <div className="text-center py-8 px-4 text-sm text-text-muted border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                                                    <p className="mb-3">No available members to invite from your organization.</p>
                                                    <Link href="/dashboard/members?invite=true" className="text-accent hover:text-accent/80 font-bold transition-colors">
                                                        Invite people to your organization first →
                                                    </Link>
                                                </div>
                                            ) : (
                                                availableToInvite.map(pm => (
                                                    <div key={pm.userId} className="flex flex-wrap items-center justify-between gap-4 p-3 bg-black/20 border border-white/5 rounded-lg hover:border-white/10 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-inner flex items-center justify-center text-white text-sm font-bold shrink-0">
                                                                {pm.user.name?.slice(0, 2).toUpperCase() || "?"}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-text-primary">{pm.user.name || "Unknown User"}</p>
                                                                <p className="text-xs text-text-muted">{pm.user.email}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddMember(pm.userId)}
                                                            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-btn text-xs font-bold transition-all active:scale-95 shadow-sm"
                                                        >
                                                            Invite
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-3">
                            {members.map((member) => (
                                <motion.div key={member.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass border border-white/[0.06] rounded-2xl shadow-sm hover:border-white/[0.12] transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-inner">
                                            {member.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-base font-semibold text-text-primary flex items-center gap-2">
                                                {member.name}
                                                {member.id === currentUserId && <span className="text-[10px] uppercase font-bold text-accent-text bg-accent/20 px-1.5 py-0.5 rounded-sm">You</span>}
                                            </p>

                                            <div className="flex items-center gap-2 mt-1">
                                                {member.role === "OWNER" ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wide">
                                                        <ShieldAlert className="w-3 h-3" /> Owner
                                                    </span>
                                                ) : member.role === "ADMIN" ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wide">
                                                        <Shield className="w-3 h-3" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-text-muted capitalize">Member</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                                        {/* OWNER/ADMIN actions: Change roles */}
                                        {((currentUserRole === "OWNER" && member.role !== "OWNER") ||
                                            (currentUserRole === "ADMIN" && member.role === "MEMBER") ||
                                            isOrgAdmin) && member.id !== currentUserId && (
                                                <select
                                                    value={member.role}
                                                    onChange={(e) => handleChangeRole(member.id, e.target.value)}
                                                    className="bg-black/40 border border-white/10 rounded-lg text-xs font-medium text-text-secondary px-2 py-1.5 hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-accent transition-colors cursor-pointer"
                                                >
                                                    <option value="MEMBER">Member</option>
                                                    <option value="ADMIN">Admin</option>
                                                </select>
                                            )}

                                        {/* Remove actions: OWNERs can remove anyone but OWNERs. ADMINs can only remove MEMBERs. Org Admins can remove anyone but themselves. */}
                                        {((currentUserRole === "OWNER" && member.role !== "OWNER") ||
                                            (currentUserRole === "ADMIN" && member.role === "MEMBER") ||
                                            isOrgAdmin) && member.id !== currentUserId && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    title="Remove member"
                                                    className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-all active:scale-95"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === "time" && (
                    <ProjectTime projectId={project.id} />
                )}

                {activeTab === "activity" && (
                    <ProjectActivity logs={activityLogs} />
                )}
            </div>

            {/* Edit Project Modal */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setIsEditing(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-md glass border border-white/[0.08] rounded-2xl shadow-elevated p-6 space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-text-primary">Edit Project</h2>
                                <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-muted">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Emoji</label>
                                    <input
                                        type="text"
                                        value={editEmoji}
                                        onChange={(e) => setEditEmoji(e.target.value)}
                                        className="w-16 px-3 py-2 bg-black/30 border border-white/10 text-2xl text-center rounded-xl focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Project Name</label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-3 py-2 bg-black/30 border border-white/10 text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-accent transition-colors text-sm"
                                        placeholder="Project name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">Description</label>
                                    <textarea
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-black/30 border border-white/10 text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-accent transition-colors text-sm resize-none"
                                        placeholder="What is this project about?"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button variant="primary" size="sm" onClick={handleEditProject} loading={editSaving} icon={<Check className="w-4 h-4" />}>
                                    Save Changes
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
