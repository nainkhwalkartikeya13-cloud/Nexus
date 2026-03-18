import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { pusherServer } from "@/lib/pusher-server";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, avatar: true } },
      }
    });

    if (!task || task.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task || task.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    const json = await req.json();

    // Permission check: regular members can only update tasks assigned to them, and only specific fields like status
    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    if (!isOrgAdmin) {
      // Check if user is a project admin/owner
      const projectMember = await prisma.projectMember.findFirst({
        where: { projectId: task.projectId, userId: session.user.id }
      });
      const isProjectAdmin = projectMember?.role === "OWNER" || projectMember?.role === "ADMIN";

      if (!isProjectAdmin) {
        if (task.assignedToId !== session.user.id) {
          return NextResponse.json({ error: "You can only update tasks assigned to you" }, { status: 403 });
        }

        const taskDueDate = task.dueDate ? new Date(task.dueDate).toISOString() : null;
        const jsonDueDate = json.dueDate ? new Date(json.dueDate).toISOString() : null;

        const taskTags = [...(task.tags || [])].sort().join(',');
        const jsonTags = json.tags ? [...json.tags].sort().join(',') : taskTags;

        const isTitleChanged = json.title && json.title !== task.title;
        const isDescriptionChanged = json.description !== undefined && (json.description || null) !== (task.description || null);
        const isDueDateChanged = json.dueDate !== undefined && jsonDueDate !== taskDueDate;
        const isTagsChanged = json.tags !== undefined && jsonTags !== taskTags;
        const isAssigneeChanged = json.assignedToId !== undefined && json.assignedToId !== task.assignedToId;
        const isPriorityChanged = json.priority && json.priority !== task.priority;

        if (isTitleChanged || isDescriptionChanged || isDueDateChanged || isTagsChanged || isAssigneeChanged || isPriorityChanged) {
          console.log("[TASK_PATCH_403] Member attempted unauthorized change:", {
            userId: session.user.id,
            taskId: task.id,
            changes: {
              title: isTitleChanged ? { from: task.title, to: json.title } : undefined,
              description: isDescriptionChanged ? { from: task.description, to: json.description } : undefined,
              dueDate: isDueDateChanged ? { from: taskDueDate, to: jsonDueDate } : undefined,
              tags: isTagsChanged ? { from: task.tags, to: json.tags } : undefined,
              assignedToId: isAssigneeChanged ? { from: task.assignedToId, to: json.assignedToId } : undefined,
              priority: isPriorityChanged ? { from: task.priority, to: json.priority } : undefined,
            }
          });
          return NextResponse.json({ error: "Members can only update the status of their assigned tasks" }, { status: 403 });
        }
      }
    }
    const body = updateTaskSchema.parse(json);

    const updated = await prisma.task.update({
      where: { id: params.id },
      data: body,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
      }
    });

    if (body.status === "DONE" && task.status !== "DONE") {
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId: task.projectId, userId: { not: session.user.id } }
      });

      await Promise.all(projectMembers.map(member =>
        createNotification({
          userId: member.userId,
          organizationId: session.user.organizationId!,
          type: "TASK_COMPLETED",
          message: `${session.user.name} completed "${task.title}"`,
          link: `/dashboard/projects/${task.projectId}?taskId=${task.id}`
        })
      ));

      await prisma.activityLog.create({
        data: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          action: "task_completed",
          entity: "Task",
          entityId: task.id,
        }
      });
    } else if (body.assignedToId && task.assignedToId !== body.assignedToId && body.assignedToId !== session.user.id) {
      await createNotification({
        userId: body.assignedToId,
        organizationId: session.user.organizationId,
        type: "TASK_ASSIGNED",
        message: `${session.user.name} assigned you to "${task.title}"`,
        link: `/dashboard/projects/${task.projectId}?taskId=${task.id}`
      });
    }

    await pusherServer?.trigger(`org-${session.user.organizationId}`, "task-updated", updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[TASK_PATCH]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task || task.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    if (!isOrgAdmin) {
      const projectMember = await prisma.projectMember.findFirst({
        where: { projectId: task.projectId, userId: session.user.id }
      });
      const isProjectAdmin = projectMember?.role === "OWNER" || projectMember?.role === "ADMIN";

      if (!isProjectAdmin) {
        return NextResponse.json({ error: "You do not have permission to delete tasks" }, { status: 403 });
      }
    }

    await prisma.$transaction([
      prisma.task.delete({ where: { id: params.id } }),
      prisma.activityLog.create({
        data: {
          organizationId: session.user.organizationId,
          userId: session.user.id,
          action: "task_deleted",
          entity: "Task",
          entityId: task.id,
          metadata: { taskTitle: task.title }
        }
      })
    ]);

    await pusherServer?.trigger(`org-${session.user.organizationId}`, "task-deleted", { taskId: params.id });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("[TASK_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
