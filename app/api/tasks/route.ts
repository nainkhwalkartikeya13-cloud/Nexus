import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { pusherServer } from "@/lib/pusher-server";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  projectId: z.string(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  tags: z.array(z.string()).default([]),
  parentTaskId: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assignedToId = searchParams.get("assignedToId");
    const parentTaskId = searchParams.get("parentTaskId");
    const search = searchParams.get("search");

    const whereClause: Prisma.TaskWhereInput = { organizationId: session.user.organizationId };

    if (projectId) whereClause.projectId = projectId;
    if (status) whereClause.status = status as TaskStatus;
    if (priority) whereClause.priority = priority as TaskPriority;
    if (assignedToId) whereClause.assignedToId = assignedToId;
    if (parentTaskId !== null) {
      whereClause.parentTaskId = parentTaskId === "null" ? null : parentTaskId;
    }
    if (search) {
      whereClause.title = { contains: search, mode: 'insensitive' };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } }
      },
      orderBy: { position: "asc" }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const body = createTaskSchema.parse(json);

    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    if (!project || project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
    }

    // RBAC: Only Org Admin/Owner or Project Admin/Owner can create tasks
    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    if (!isOrgAdmin) {
      const pm = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId: session.user.id } }
      });
      if (!pm || (pm.role !== "OWNER" && pm.role !== "ADMIN")) {
        return NextResponse.json({ error: "Forbidden: Requires Admin role to add tasks" }, { status: 403 });
      }
    }

    const maxPositionTask = await prisma.task.findFirst({
      where: { projectId: body.projectId, status: body.status },
      orderBy: { position: "desc" }
    });
    const position = maxPositionTask ? maxPositionTask.position + 1 : 0;

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        projectId: body.projectId,
        status: body.status,
        priority: body.priority,
        assignedToId: body.assignedToId,
        dueDate: body.dueDate,
        tags: body.tags,
        parentTaskId: body.parentTaskId,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        position
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } }
      }
    });

    if (body.assignedToId && body.assignedToId !== session.user.id) {
      await createNotification({
        userId: body.assignedToId,
        organizationId: session.user.organizationId,
        type: "TASK_ASSIGNED",
        message: `${session.user.name} assigned you to "${task.title}"`,
        link: `/dashboard/projects/${project.id}?taskId=${task.id}`
      });
    }

    await prisma.activityLog.create({
      data: {
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: "task_created",
        entity: "Task",
        entityId: task.id,
      }
    });

    await pusherServer?.trigger(`org-${session.user.organizationId}`, "task-created", task);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[TASKS_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as z.ZodError).issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
