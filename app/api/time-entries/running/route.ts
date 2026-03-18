import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        let targetUserId = searchParams.get("userId") || session.user.id;

        // Authorization check: Only Admin/Owner can view others or "all"
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
        if (targetUserId !== session.user.id && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const where: any = {
            organizationId: session.user.organizationId,
            endTime: null,
        };
        if (targetUserId !== "all") {
            where.userId = targetUserId;
        }

        if (targetUserId === "all") {
            const runningAll = await prisma.timeEntry.findMany({
                where,
                include: {
                    user: { select: { id: true, name: true, avatar: true } },
                    task: { select: { id: true, title: true } },
                    project: { select: { id: true, name: true, emoji: true, color: true } },
                },
                orderBy: { startTime: 'desc' }
            });
            return NextResponse.json(runningAll);
        } else {
            const runningSingle = await prisma.timeEntry.findFirst({
                where,
                include: {
                    task: { select: { id: true, title: true } },
                    project: { select: { id: true, name: true, emoji: true, color: true } },
                },
            });
            return NextResponse.json(runningSingle || {});
        }
    } catch (error) {
        console.error("[TIME_ENTRIES_RUNNING]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
