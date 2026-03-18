import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
    description: z.string().nullable().optional(),
    taskId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    billable: z.boolean().optional(),
    hourlyRate: z.number().nullable().optional(),
    startTime: z.string().optional(),
    endTime: z.string().nullable().optional(),
});

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const data = updateSchema.parse(json);

        const existing = await prisma.timeEntry.findFirst({
            where: { id, userId: session.user.id, organizationId: session.user.organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (data.description !== undefined) updateData.description = data.description;
        if (data.taskId !== undefined) updateData.taskId = data.taskId;
        if (data.projectId !== undefined) updateData.projectId = data.projectId;
        if (data.billable !== undefined) updateData.billable = data.billable;
        if (data.hourlyRate !== undefined) updateData.hourlyRate = data.hourlyRate;
        if (data.startTime) updateData.startTime = new Date(data.startTime);
        if (data.endTime !== undefined) {
            if (data.endTime) {
                const end = new Date(data.endTime);
                const start = data.startTime ? new Date(data.startTime) : existing.startTime;
                updateData.endTime = end;
                updateData.duration = Math.round((end.getTime() - start.getTime()) / 1000);
            } else {
                updateData.endTime = null;
                updateData.duration = null;
            }
        }

        const updated = await prisma.timeEntry.update({
            where: { id },
            data: updateData,
            include: {
                task: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[TIME_ENTRY_PUT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.timeEntry.deleteMany({
            where: { id, userId: session.user.id, organizationId: session.user.organizationId },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[TIME_ENTRY_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const json = await req.json();

        const existing = await prisma.timeEntry.findFirst({
            where: { id, organizationId: session.user.organizationId },
        });

        if (!existing) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const updated = await prisma.timeEntry.update({
            where: { id },
            data: { isPaid: json.isPaid },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[TIME_ENTRY_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
