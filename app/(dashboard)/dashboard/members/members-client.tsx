"use client";

import { useState, useEffect } from "react";
import NextImage from "next/image";
import {
    Users, UserPlus, MoreVertical, Shield, Crown,
    Trash2, Mail, Clock, RefreshCw, X, Check, Copy,
    ArrowUpRight, DollarSign
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Badge } from "@/components/shared/Badge";
import { InviteModal } from "@/components/dashboard/invite-modal";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { OrgMemberRole } from "@prisma/client";

interface Member {
    id: string;
    userId: string;
    role: OrgMemberRole;
    hourlyRate: number | null;
    joinedAt: string;
    user: {
        id: string;
        name: string | null;
        email: string | null;
        avatar: string | null;
    };
}

interface Invitation {
    id: string;
    email: string;
    role: OrgMemberRole;
    createdAt: string;
    expiresAt: string;
    token: string | null;
}

interface Props {
    initialMembers: Member[];
    initialInvitations: Invitation[];
    orgName: string;
    plan: string;
    planLimit: number;
    currentUserId: string;
}

export function MembersClient({
    initialMembers,
    initialInvitations,
    orgName,
    plan,
    planLimit,
    currentUserId
}: Props) {
    const [members, setMembers] = useState<Member[]>(initialMembers);
    const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    /* ── Handle Query Params ── */
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("invite") === "true") {
            setIsInviteModalOpen(true);
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // Modals
    const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
    const [inviteToCancel, setInviteToCancel] = useState<Invitation | null>(null);
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [rateInput, setRateInput] = useState("");

    const currentMember = members.find(m => m.userId === currentUserId);
    const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";

    const totalOccupied = members.length + invitations.length;
    const usagePercent = Math.min((totalOccupied / planLimit) * 100, 100);

    const handleRoleChange = async (memberId: string, newRole: OrgMemberRole) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/members/${memberId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
            toast.success("Role updated successfully");
        } catch {
            toast.error("Failed to update role");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/members/${memberToRemove.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
            toast.success("Member removed from team");
            setMemberToRemove(null);
        } catch {
            toast.error("Failed to remove member");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvite = async () => {
        if (!inviteToCancel) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/invitations/${inviteToCancel.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            setInvitations(prev => prev.filter(i => i.id !== inviteToCancel.id));
            toast.success("Invitation cancelled");
            setInviteToCancel(null);
        } catch {
            toast.error("Failed to cancel invitation");
        } finally {
            setLoading(false);
        }
    };

    const handleResendInvite = async (inviteId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/invitations/${inviteId}`, { method: "PATCH" });
            if (!res.ok) throw new Error();
            toast.success("Invitation resent");
        } catch {
            toast.error("Failed to resend invitation");
        } finally {
            setLoading(false);
        }
    };

    const handleSetRate = async (memberId: string) => {
        const rate = parseFloat(rateInput);
        if (isNaN(rate) || rate < 0) {
            toast.error("Please enter a valid rate");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/members/${memberId}/rate`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ hourlyRate: rate || null }),
            });
            if (!res.ok) throw new Error();
            setMembers(prev => prev.map(m =>
                m.id === memberId ? { ...m, hourlyRate: rate || null } : m
            ));
            toast.success(`Hourly rate updated to ₹${rate}/hr`);
            setEditingRateId(null);
            setRateInput("");
        } catch {
            toast.error("Failed to update rate");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader heading="Team Members" description={`Manage your team in ${orgName}`}>
                <div className="flex items-center gap-2">
                    <Badge className="bg-bg-hover border-border text-text-muted">{members.length} active</Badge>
                    {isAdmin && <Button onClick={() => setIsInviteModalOpen(true)} icon={<UserPlus className="h-4 w-4" />}>Invite Member</Button>}
                </div>
            </PageHeader>

            {/* ── PLAN USAGE BAR ── */}
            {isAdmin && (
                <Card className="p-6 border-border/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Workspace Plan</h3>
                                <Badge className={cn(
                                    "uppercase text-[10px] font-bold tracking-widest px-2 py-0.5",
                                    plan === 'PRO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                        plan === 'STARTER' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            'bg-slate-500/10 text-text-muted border-border'
                                )}>
                                    {plan}
                                </Badge>
                            </div>
                            <p className="text-xs text-text-muted">You are using {totalOccupied} of {planLimit} seats available on your {plan} plan.</p>
                        </div>
                        <div className="flex-1 max-w-md space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter">
                                <span className="text-text-muted">Usage</span>
                                <span className={cn(
                                    usagePercent >= 100 ? "text-danger" : usagePercent >= 80 ? "text-amber-500" : "text-text-primary"
                                )}>
                                    {totalOccupied} / {planLimit} seats
                                </span>
                            </div>
                            <div className="h-2 w-full bg-bg-hover rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${usagePercent}%` }}
                                    className={cn(
                                        "h-full transition-all duration-1000",
                                        usagePercent >= 100 ? "bg-danger" : usagePercent >= 80 ? "bg-amber-500" : "bg-accent"
                                    )}
                                />
                            </div>
                        </div>
                        {plan !== 'ENTERPRISE' && (
                            <Link href="/dashboard/billing" className="flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-light transition-colors group">
                                Upgrade Plan <ArrowUpRight className="h-4 w-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </Link>
                        )}
                    </div>
                </Card>
            )}

            {/* ── MEMBERS GRID ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {members.map((member, idx) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <Card className="p-5 border-border/50 relative group overflow-hidden">
                                <div className="flex items-start gap-4">
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-full bg-bg-hover border border-border flex items-center justify-center text-sm font-bold text-text-primary overflow-hidden ring-2 ring-transparent group-hover:ring-accent/20 transition-all">
                                            {member.user.avatar ? (
                                                <NextImage
                                                    src={member.user.avatar}
                                                    alt={member.user.name || "Member"}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                member.user.name?.[0].toUpperCase()
                                            )}
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-bg-surface" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[15px] font-bold text-text-primary truncate">{member.user.name}</h4>
                                            {member.userId === currentUserId && <Badge className="bg-accent/10 text-accent border-accent/20 text-[9px] px-1.5 py-0">You</Badge>}
                                        </div>
                                        <p className="text-xs text-text-muted truncate mb-2">{member.user.email}</p>
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-bold tracking-widest px-1.5 py-0.5",
                                            member.role === 'OWNER' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                member.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    'bg-bg-hover text-text-muted border-border'
                                        )}>
                                            {member.role === 'OWNER' ? <Crown className="h-2.5 w-2.5 mr-1 inline" /> : null}
                                            {member.role === 'ADMIN' ? <Shield className="h-2.5 w-2.5 mr-1 inline" /> : null}
                                            {member.role}
                                        </Badge>
                                    </div>

                                    {/* Actions */}
                                    {isAdmin && member.userId !== currentUserId && member.role !== 'OWNER' && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors opacity-0 group-hover:opacity-100">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="glass border-border w-48">
                                                <DropdownMenuLabel className="text-[10px] uppercase text-text-muted tracking-widest">Change Role</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "MEMBER")}>
                                                    <Users className="h-3.5 w-3.5 mr-2" /> Member
                                                    {member.role === "MEMBER" && <Check className="h-3 w-3 ml-auto text-accent" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(member.id, "ADMIN")}>
                                                    <Shield className="h-3.5 w-3.5 mr-2" /> Admin
                                                    {member.role === "ADMIN" && <Check className="h-3 w-3 ml-auto text-accent" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-bg-hover" />
                                                <DropdownMenuItem onClick={() => {
                                                    setEditingRateId(member.id);
                                                    setRateInput(member.hourlyRate?.toString() || "");
                                                }}>
                                                    <DollarSign className="h-3.5 w-3.5 mr-2" /> Set Hourly Rate
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator className="bg-bg-hover" />
                                                <DropdownMenuItem className="text-danger focus:bg-danger/10" onClick={() => setMemberToRemove(member)}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove Member
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                                    <span className="text-[10px] text-text-muted">Member since {format(new Date(member.joinedAt), "MMM yyyy")}</span>
                                    {editingRateId === member.id ? (
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-text-muted font-bold">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50"
                                                value={rateInput}
                                                onChange={(e) => setRateInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleSetRate(member.id); if (e.key === "Escape") setEditingRateId(null); }}
                                                className="w-20 px-2 py-1 text-xs font-bold bg-bg-base border border-accent/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/40 text-text-primary"
                                                placeholder="500"
                                                autoFocus
                                            />
                                            <span className="text-[10px] text-text-muted font-bold">/hr</span>
                                            <button onClick={() => handleSetRate(member.id)} className="h-6 w-6 rounded-md bg-accent/10 text-accent hover:bg-accent/20 flex items-center justify-center transition-colors">
                                                <Check className="h-3 w-3" />
                                            </button>
                                            <button onClick={() => setEditingRateId(null)} className="h-6 w-6 rounded-md bg-bg-hover text-text-muted hover:text-text-primary flex items-center justify-center transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        member.hourlyRate ? (
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                                ₹{member.hourlyRate}/hr
                                            </span>
                                        ) : isAdmin && member.userId !== currentUserId ? (
                                            <button
                                                onClick={() => {
                                                    setEditingRateId(member.id);
                                                    setRateInput("");
                                                }}
                                                className="text-[10px] font-bold text-text-muted hover:text-accent transition-colors"
                                            >
                                                + Set rate
                                            </button>
                                        ) : null
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ── PENDING INVITATIONS ── */}
            {invitations.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Pending Invitations</h3>
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">{invitations.length}</Badge>
                    </div>

                    <div className="space-y-3">
                        {invitations.map((invite) => {
                            const expiresSoon = new Date(invite.expiresAt).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 2;
                            return (
                                <Card key={invite.id} className="p-4 border-border/50 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-bg-hover border border-border flex items-center justify-center text-accent">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-text-primary tracking-wide">{invite.email}</span>
                                                <Badge className="text-[9px] px-1.5 py-0 bg-bg-hover text-text-muted border-border">{invite.role}</Badge>
                                            </div>
                                            <div className={cn(
                                                "flex items-center gap-1.5 text-[10px] mt-0.5",
                                                expiresSoon ? "text-amber-500" : "text-text-muted"
                                            )}>
                                                <Clock className="h-3 w-3" />
                                                Expires {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 border-border/50 text-[10px] uppercase font-bold tracking-widest"
                                            onClick={() => {
                                                if (invite.token) {
                                                    navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`);
                                                    toast.success("Invite link copied!");
                                                }
                                            }}
                                        >
                                            <Copy className="h-3 w-3 mr-1.5" /> Copy Link
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 border-border/50 text-[10px] uppercase font-bold tracking-widest"
                                            onClick={() => handleResendInvite(invite.id)}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1.5" /> Resend
                                        </Button>
                                        <button
                                            onClick={() => setInviteToCancel(invite)}
                                            className="h-8 w-8 rounded-lg flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── MODALS ── */}
            <InviteModal
                open={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                onSuccess={() => window.location.reload()}
            />

            <ConfirmModal
                open={!!memberToRemove}
                onClose={() => setMemberToRemove(null)}
                onConfirm={handleRemoveMember}
                loading={loading}
                title="Remove Member"
                description={`Are you sure you want to remove ${memberToRemove?.user.name}? They will lose access to all work in ${orgName}.`}
                confirmLabel="Remove"
            />

            <ConfirmModal
                open={!!inviteToCancel}
                onClose={() => setInviteToCancel(null)}
                onConfirm={handleCancelInvite}
                loading={loading}
                title="Cancel Invitation"
                description={`This will invalidate the invitation sent to ${inviteToCancel?.email}.`}
                confirmLabel="Cancel Invite"
            />
        </div>
    );
}

import Link from "next/link";
