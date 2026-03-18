import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher-server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, position } = await req.json();
    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: { project: { select: { organizationId: true } } }
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Permission check
    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    if (!isOrgAdmin) {
      const projectMember = await prisma.projectMember.findFirst({
        where: { projectId: existingTask.projectId, userId: session.user.id }
      });
      const isProjectAdmin = projectMember?.role === "OWNER" || projectMember?.role === "ADMIN";

      if (!isProjectAdmin && existingTask.assignedToId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only move tasks assigned to you" },
          { status: 403 }
        );
      }
    }

    // Core DB update
    console.log(`[TASK_MOVE] Updating task ${params.id}: ${existingTask.status} → ${status} at pos ${position}`);

    // Begin transaction for reordering if position is provided
    if (typeof position === "number") {
      const destTasks = await prisma.task.findMany({
        where: { projectId: existingTask.projectId, status },
        orderBy: { position: "asc" },
      });

      const filtered = destTasks.filter(t => t.id !== params.id);
      filtered.splice(position, 0, existingTask as any);

      await prisma.$transaction(
        filtered.map((t, index) =>
          prisma.task.update({
            where: { id: t.id },
            data: { position: index, ...(t.id === params.id && { status }) }
          })
        )
      );
    } else {
      await prisma.task.update({
        where: { id: params.id },
        data: { status }
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Task update failed" }, { status: 500 });
    }
    console.log(`[TASK_MOVE] Prisma returned status: ${task.status}`);

    // Verify the update actually persisted
    const verify = await prisma.task.findUnique({ where: { id: params.id }, select: { status: true } });
    console.log(`[TASK_MOVE] DB verification: ${verify?.status}`);
    if (verify?.status !== status) {
      console.error(`[TASK_MOVE] ⚠️ DB MISMATCH! Expected ${status} but got ${verify?.status}`);
    }

    // Non-critical: activity log
    try {
      if (session.user.organizationId) {
        await prisma.activityLog.create({
          data: {
            action: "task_moved",
            entity: task.title,
            entityId: task.id,
            organizationId: session.user.organizationId,
            userId: session.user.id,
          },
        });
      }
    } catch { }

    // Non-critical: pusher
    try {
      if (pusherServer && existingTask.project.organizationId) {
        await pusherServer.trigger(
          `org-${existingTask.project.organizationId}`,
          "task-moved",
          {
            taskId: task.id,
            newStatus: task.status,
            movedBy: session.user.name || "A team member",
            userId: session.user.id
          }
        );
      }
    } catch { }

    try { revalidatePath(`/dashboard/projects/${existingTask.projectId}`); } catch { }

    return NextResponse.json({
      id: task.id,
      status: task.status,
      title: task.title,
      assignedTo: task.assignedTo,
    });

  } catch (error) {
    console.error("[TASK_MOVE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
