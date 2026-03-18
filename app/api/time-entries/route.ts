import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createEntrySchema = z.object({
    taskId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    description: z.string().optional(),
    startTime: z.string().optional(), // ISO string, defaults to now
    endTime: z.string().nullable().optional(),
    billable: z.boolean().default(true),
    hourlyRate: z.number().nullable().optional(),
});

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const targetUserId = searchParams.get("userId") || session.user.id;
        const projectId = searchParams.get("projectId");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        // Authorization check: Only Admin/Owner can view others or "all" globally
        const isOrgAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
        let isAuthorized = isOrgAdmin || targetUserId === session.user.id;

        if (!isAuthorized && projectId) {
            // Allow project members to view project-specific time stats
            const projectMember = await prisma.projectMember.findFirst({
                where: { projectId, userId: session.user.id }
            });
            if (projectMember) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const where: any = {
            organizationId: session.user.organizationId,
        };
        if (targetUserId !== "all") {
            where.userId = targetUserId;
        }
        if (projectId) where.projectId = projectId;
        if (from || to) {
            where.startTime = {};
            if (from) (where.startTime as Record<string, unknown>).gte = new Date(from);
            if (to) (where.startTime as Record<string, unknown>).lte = new Date(to);
        }

        const entries = await prisma.timeEntry.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                task: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
            orderBy: { startTime: "desc" },
        });

        return NextResponse.json(entries);
    } catch (error) {
        console.error("[TIME_ENTRIES_GET]", error);
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
        const data = createEntrySchema.parse(json);

        // Check if there's already a running timer
        const running = await prisma.timeEntry.findFirst({
            where: {
                userId: session.user.id,
                organizationId: session.user.organizationId,
                endTime: null,
            },
        });

        if (running && !data.endTime) {
            return NextResponse.json(
                { error: "You already have a running timer. Stop it first." },
                { status: 400 }
            );
        }

        const startTime = data.startTime ? new Date(data.startTime) : new Date();
        let duration: number | null = null;
        let endTime: Date | null = null;

        if (data.endTime) {
            endTime = new Date(data.endTime);
            duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
        }

        // Auto-populate hourlyRate from member's default rate if not provided
        let hourlyRate = data.hourlyRate ?? null;
        if (hourlyRate === null) {
            const member = await prisma.organizationMember.findFirst({
                where: {
                    userId: session.user.id,
                    organizationId: session.user.organizationId,
                },
                select: { hourlyRate: true },
            });
            hourlyRate = member?.hourlyRate ?? null;
        }

        const entry = await prisma.timeEntry.create({
            data: {
                organizationId: session.user.organizationId,
                userId: session.user.id,
                taskId: data.taskId ?? undefined,
                projectId: data.projectId ?? undefined,
                description: data.description,
                startTime,
                endTime,
                duration,
                billable: data.billable,
                hourlyRate,
            },
            include: {
                task: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
        });

        return NextResponse.json(entry, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[TIME_ENTRIES_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
