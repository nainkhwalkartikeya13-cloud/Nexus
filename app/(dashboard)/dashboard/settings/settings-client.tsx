"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings as SettingsIcon,
    Shield,
    Bell,
    Trash2,
    User as UserIcon,
    Upload,
    Lock,
    AlertTriangle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Card } from "@/components/shared/Card";
import { Switch } from "@/components/shared/Switch";
import { Avatar } from "@/components/shared/Avatar";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
    user: {
        id: string;
        name: string;
        email: string;
        avatar: string | null;
        notificationPreferences: Record<string, boolean>;
    };
    organization: {
        id: string;
        name: string;
        slug: string;
    };
    isAdmin: boolean;
    isOwner: boolean;
}

const profileSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    avatar: z.string().optional().nullable(),
});

const orgSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters"),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type Tab = "general" | "security" | "notifications" | "danger";

export function SettingsClient({ user, organization, isAdmin, isOwner }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("general");

    const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: "general", label: "General", icon: UserIcon },
        { id: "security", label: "Security", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    if (isOwner) {
        tabs.push({ id: "danger", label: "Danger Zone", icon: Trash2 });
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Tabs */}
            <div className="w-full md:w-64 space-y-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                            activeTab === tab.id
                                ? "bg-accent/10 text-accent border border-accent/20"
                                : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {activeTab === "general" && (
                            <GeneralSettings user={user} organization={organization} isAdmin={isAdmin} />
                        )}
                        {activeTab === "security" && (
                            <SecuritySettings />
                        )}
                        {activeTab === "notifications" && (
                            <NotificationSettings initialPreferences={user.notificationPreferences} />
                        )}
                        {activeTab === "danger" && isOwner && (
                            <DangerZoneSettings organization={organization} />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function GeneralSettings({ user, organization, isAdmin }: {
    user: { name: string; email: string; avatar: string | null };
    organization: { name: string; slug: string };
    isAdmin: boolean
}) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const profileForm = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user.name,
            avatar: user.avatar,
        }
    });

    const orgForm = useForm<z.infer<typeof orgSchema>>({
        resolver: zodResolver(orgSchema),
        defaultValues: {
            name: organization.name,
        }
    });

    const onProfileSubmit = async (values: z.infer<typeof profileSchema>) => {
        try {
            setLoading(true);
            const res = await fetch("/api/settings/profile", {
                method: "PATCH",
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Failed to update profile");

            toast.success("Profile updated successfully");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const onOrgSubmit = async (values: z.infer<typeof orgSchema>) => {
        try {
            setLoading(true);
            const res = await fetch("/api/settings/org", {
                method: "PATCH",
                body: JSON.stringify(values),
            });

            if (!res.ok) throw new Error("Failed to update organization");

            toast.success("Organization updated successfully");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Profile Settings */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-accent" />
                    Profile Settings
                </h3>

                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <Avatar
                                image={profileForm.getValues("avatar") || undefined}
                                name={user.name}
                                className="h-20 w-20 text-2xl border-2 border-accent/20 group-hover:border-accent/50 transition-colors"
                            />
                            <label
                                htmlFor="avatar-upload"
                                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-opacity"
                            >
                                <Upload className="h-6 w-6 text-white" />
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        // In a real app, upload to Cloudinary/S3
                                        // For now, we'll convert to base64
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            profileForm.setValue("avatar", reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">Avatar</p>
                            <p className="text-xs text-text-secondary">Click to upload a new profile picture. Recommended 1:1 ratio.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label="Full Name"
                            {...profileForm.register("name")}
                            error={profileForm.formState.errors.name?.message}
                        />
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text-secondary">Email Address</label>
                            <div className="h-10 px-3 bg-white/5 border border-bg-border rounded-btn flex items-center text-text-muted text-sm cursor-not-allowed">
                                {user.email}
                            </div>
                            <p className="text-[10px] text-text-muted">Email cannot be changed. Contact support if needed.</p>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" loading={loading} className="w-full md:w-auto">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Organization Settings */}
            {isAdmin && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5 text-accent" />
                        Organization Settings
                    </h3>

                    <form onSubmit={orgForm.handleSubmit(onOrgSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                label="Organization Name"
                                {...orgForm.register("name")}
                                error={orgForm.formState.errors.name?.message}
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-text-secondary">Workspace Slug</label>
                                <div className="h-10 px-3 bg-white/5 border border-bg-border rounded-btn flex items-center text-text-muted text-sm cursor-not-allowed">
                                    {organization.slug}
                                </div>
                                <p className="text-[10px] text-text-muted">nexus.app/org/{organization.slug}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" loading={loading} className="w-full md:w-auto">
                                Save Organization
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
        </div>
    );
}

function SecuritySettings() {
    const [loading, setLoading] = useState(false);
    const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema)
    });

    const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
        try {
            setLoading(true);
            const res = await fetch("/api/settings/password", {
                method: "POST",
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to update password");
            }

            toast.success("Password updated successfully");
            reset();
        } catch (error) {
            toast.error((error as Error).message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const password = watch("newPassword", "");
    const strength = password.length === 0 ? 0 :
        password.length < 8 ? 1 :
            password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/) ? 3 : 2;

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Lock className="h-5 w-5 text-accent" />
                Security Settings
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
                <Input
                    label="Current Password"
                    type="password"
                    {...register("currentPassword")}
                    error={errors.currentPassword?.message}
                />

                <div className="space-y-2">
                    <Input
                        label="New Password"
                        type="password"
                        {...register("newPassword")}
                        error={errors.newPassword?.message}
                    />
                    {password.length > 0 && (
                        <div className="flex gap-1 h-1">
                            {[1, 2, 3].map((s) => (
                                <div
                                    key={s}
                                    className={cn(
                                        "flex-1 rounded-full transition-colors",
                                        strength >= s
                                            ? (strength === 1 ? "bg-red-500" : strength === 2 ? "bg-yellow-500" : "bg-green-500")
                                            : "bg-white/10"
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <Input
                    label="Confirm New Password"
                    type="password"
                    {...register("confirmPassword")}
                    error={errors.confirmPassword?.message}
                />

                <Button type="submit" loading={loading} fullWidth>
                    Update Password
                </Button>
            </form>
        </Card>
    );
}

const NOTIFICATION_TYPES = [
    { id: "taskAssigned", label: "Task assigned to me", description: "Receive a notification when a team member assigns a task to you." },
    { id: "taskCompleted", label: "Task completed", description: "Get notified when a task you created or were assigned to is marked as done." },
    { id: "memberJoined", label: "New team member joins", description: "Receive an alert when a new person joins your organization." },
    { id: "projectCreated", label: "New project created", description: "Be notified when a new workspace project is initialized." },
    { id: "paymentIssues", label: "Payment & Subscription", description: "Crucial alerts regarding your billing, invoices, and plan status." },
];

function NotificationSettings({ initialPreferences }: { initialPreferences: Record<string, boolean> }) {
    const [prefs, setPrefs] = useState(initialPreferences || {
        taskAssigned: true,
        taskCompleted: true,
        memberJoined: true,
        projectCreated: true,
        paymentIssues: true,
    });

    const updatePreference = async (id: string, value: boolean) => {
        const newPrefs = { ...prefs, [id]: value };
        setPrefs(newPrefs);

        try {
            const res = await fetch("/api/settings/notifications", {
                method: "PATCH",
                body: JSON.stringify(newPrefs),
            });

            if (!res.ok) throw new Error();
            toast.success("Preferences saved");
        } catch {
            toast.error("Failed to save preferences");
            setPrefs(prefs); // rollback
        }
    };

    return (
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                Notification Settings
            </h3>
            <p className="text-sm text-text-secondary mb-8">Manage how and when you receive alerts from Nexus.</p>

            <div className="space-y-6">
                {NOTIFICATION_TYPES.map((type) => (
                    <div key={type.id} className="flex items-center justify-between gap-4 py-4 border-b border-white/5 last:border-0">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{type.label}</p>
                            <p className="text-xs text-text-secondary leading-relaxed">{type.description}</p>
                        </div>
                        <Switch
                            checked={prefs[type.id as keyof typeof prefs]}
                            onChange={(val) => updatePreference(type.id, val)}
                        />
                    </div>
                ))}
            </div>
        </Card>
    );
}

function DangerZoneSettings({ organization }: { organization: { name: string } }) {
    const [loading, setLoading] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const onDelete = async () => {
        if (confirmText !== organization.name) return;

        try {
            setLoading(true);
            const res = await fetch("/api/settings/organization", {
                method: "DELETE",
                body: JSON.stringify({ confirmName: confirmText }),
            });

            if (!res.ok) throw new Error("Failed to delete organization");

            toast.success("Organization deleted successfully");
            await signOut({ callbackUrl: "/register" });
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="p-6 border-red-500/20 bg-red-500/5">
            <h3 className="text-lg font-semibold mb-2 text-red-500 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
            </h3>
            <p className="text-sm text-text-secondary mb-8">Proceed with extreme caution. This action is irreversible.</p>

            <div className="space-y-6">
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <h4 className="text-sm font-semibold text-red-500 mb-1">Delete this organization</h4>
                    <p className="text-xs text-red-400 leading-relaxed mb-4">
                        Once you delete an organization, there is no going back. Please be certain.
                        All tasks, projects, and data for this workspace will be permanently erased.
                    </p>

                    <div className="space-y-3">
                        <p className="text-xs text-text-secondary">
                            Please type <span className="font-bold text-text-primary">&quot;{organization.name}&quot;</span> to confirm.
                        </p>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="Type organization name..."
                            className="max-w-md border-red-500/20 focus:border-red-500/50"
                        />
                        <Button
                            variant="danger"
                            onClick={onDelete}
                            loading={loading}
                            disabled={confirmText !== organization.name}
                            className="mt-2"
                        >
                            Permanently Delete Organization
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
