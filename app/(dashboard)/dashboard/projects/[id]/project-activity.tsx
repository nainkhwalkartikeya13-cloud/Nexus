"use client";

import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Activity } from "lucide-react";

interface ActivityLog {
    id: string;
    action: string;
    entity: string;
    entityId: string;
    metadata: any;
    createdAt: string;
    user: {
        id: string;
        name: string;
        avatar: string | null;
    };
}

interface ProjectActivityProps {
    logs: ActivityLog[];
}

export function ProjectActivity({ logs }: ProjectActivityProps) {
    if (!logs || logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <Activity className="h-12 w-12 text-text-muted/30 mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">No activity yet</h3>
                <p className="text-sm text-text-muted max-w-sm">
                    When team members move tasks or update the project, their activity will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-8">
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                {logs.map((log) => {
                    let actionText = "performed an action";

                    if (log.action === "MOVED_TASK") {
                        const from = log.metadata?.from?.replace("_", " ") || "Unknown";
                        const to = log.metadata?.to?.replace("_", " ") || "Unknown";
                        const title = log.metadata?.taskTitle || "a task";
                        actionText = `moved "${title}" from ${from} to ${to}`;
                    }

                    return (
                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            {/* Timeline dot */}
                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-bg-elevated shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={log.user.avatar || undefined} />
                                    <AvatarFallback className="text-xs bg-accent/20 text-accent-light">
                                        {log.user.name.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Card */}
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/5 bg-bg-surface/50 backdrop-blur-sm hover:bg-bg-elevated transition-colors shadow-sm">
                                <div className="flex flex-col space-y-1">
                                    <div className="text-sm">
                                        <span className="font-semibold text-text-primary">{log.user.name}</span>{" "}
                                        <span className="text-text-secondary">{actionText}</span>
                                    </div>
                                    <time className="text-xs font-medium text-text-muted">
                                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                    </time>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
