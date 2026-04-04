import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { format } from "date-fns";
import { Activity, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/shared/Card";

export const metadata: Metadata = {
    title: "Activity | Nexus",
    description: "View all recent activity across your workspace.",
};

export default async function ActivityPage() {
    const session = await auth();

    if (!session?.user?.id) redirect("/login");
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) redirect("/onboarding?new=true");
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

    const logs = await prisma.activityLog.findMany({
        where: { organizationId: session.user.organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            user: { select: { name: true, avatar: true } },
        },
    });

    const actionLabel: Record<string, string> = {
        created_project: "created project",
        updated_project: "updated project",
        created_task: "created task",
        updated_task: "updated task",
        assigned_task: "assigned task",
        completed_task: "completed task",
        updated_status: "updated status",
        invited_member: "invited member",
        added_attachment: "added attachment",
        added_comment: "added a comment on",
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-white tracking-tight">Activity Log</h1>
                <p className="text-text-muted mt-1">All recent actions across your workspace.</p>
            </div>

            <Card className="p-6">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Activity className="h-10 w-10 text-accent/20 mb-4" />
                        <p className="text-text-muted">No activity yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-4 group">
                                <div className="relative flex flex-col items-center">
                                    <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-4 w-4 text-accent" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary">
                                        <span className="font-semibold">{log.user.name}</span>{" "}
                                        <span className="text-text-muted">
                                            {actionLabel[log.action] ?? log.action.replace(/_/g, " ")}
                                        </span>{" "}
                                        <span className="text-accent font-medium">{log.entity}</span>
                                    </p>
                                    <p className="text-xs text-text-muted mt-1">
                                        {format(new Date(log.createdAt), "MMM d, yyyy · h:mm a")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
