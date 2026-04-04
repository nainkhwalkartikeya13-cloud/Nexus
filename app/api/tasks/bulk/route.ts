import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskStatus, TaskPriority } from "@prisma/client";

const bulkUpdateSchema = z.object({
    ids: z.array(z.string()),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assignedToId: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
    try {
        const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

        const json = await req.json();
        const { ids, status, priority, assignedToId } = bulkUpdateSchema.parse(json);

        if (ids.length === 0) {
            return new NextResponse("No IDs provided", { status: 400 });
        }

        const updateData: Prisma.TaskUncheckedUpdateManyInput = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

        await prisma.task.updateMany({
            where: {
                id: { in: ids },
                organizationId: session.user.organizationId
            },
            data: updateData
        });

        // Create Activity Log
        await prisma.activityLog.create({
            data: {
                action: "bulk_task_update",
                entity: "Task",
                entityId: "BULK",
                organizationId: session.user.organizationId,
                userId: session.user.id,
                metadata: { count: ids.length, updates: updateData } as Prisma.JsonObject
            },
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("[TASKS_BULK_PATCH]", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return new NextResponse("No IDs provided", { status: 400 });
        }

        await prisma.task.deleteMany({
            where: {
                id: { in: ids },
                organizationId: session.user.organizationId
            }
        });

        // Create Activity Log
        await prisma.activityLog.create({
            data: {
                action: "bulk_task_delete",
                entity: "Task",
                entityId: "BULK",
                organizationId: session.user.organizationId,
                userId: session.user.id,
                metadata: { count: ids.length } as Prisma.JsonObject
            },
        });

        return NextResponse.json({ success: true, count: ids.length });
    } catch (error) {
        console.error("[TASKS_BULK_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
