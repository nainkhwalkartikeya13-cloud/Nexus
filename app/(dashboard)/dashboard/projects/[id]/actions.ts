"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";

export async function moveTaskAction(
    taskId: string,
    newStatus: TaskStatus,
    newPosition: number,
    projectId: string
) {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
        throw new Error("Unauthorized");
    }

    const existingTask = await prisma.task.findUnique({
        where: { id: taskId, projectId },
    });

    if (!existingTask) throw new Error("Task not found");

    // Permission check
    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    if (!isOrgAdmin) {
        const projectMember = await prisma.projectMember.findFirst({
            where: { projectId, userId: session.user.id },
        });
        const isProjectAdmin = projectMember?.role === "OWNER" || projectMember?.role === "ADMIN";

        if (!isProjectAdmin && existingTask.assignedToId !== session.user.id) {
            throw new Error("You can only move tasks assigned to you");
        }
    }

    // Get tasks in the destination column
    const destTasks = await prisma.task.findMany({
        where: { projectId, status: newStatus },
        orderBy: { position: "asc" },
    });

    const filtered = destTasks.filter((t) => t.id !== taskId);
    filtered.splice(newPosition, 0, existingTask as any);

    // Execute transaction
    await prisma.$transaction([
        ...filtered.map((t, index) =>
            prisma.task.update({
                where: { id: t.id },
                data: {
                    position: index,
                    ...(t.id === taskId && { status: newStatus }),
                },
            })
        ),
        prisma.activityLog.create({
            data: {
                organizationId: session.user.organizationId,
                userId: session.user.id,
                action: "MOVED_TASK",
                entity: "Project",
                entityId: projectId,
                metadata: {
                    taskId: taskId,
                    taskTitle: existingTask.title,
                    from: existingTask.status,
                    to: newStatus,
                },
            },
        })
    ]);

    revalidatePath(`/dashboard/projects/${projectId}`);
    return true;
}
