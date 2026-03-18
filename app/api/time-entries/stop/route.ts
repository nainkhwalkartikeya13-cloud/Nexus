import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const running = await prisma.timeEntry.findFirst({
            where: {
                userId: session.user.id,
                organizationId: session.user.organizationId,
                endTime: null,
            },
        });

        if (!running) {
            return NextResponse.json({ error: "No running timer found" }, { status: 404 });
        }

        const endTime = new Date();
        const duration = Math.round((endTime.getTime() - running.startTime.getTime()) / 1000);

        // Backfill hourlyRate from member default if not already set
        let hourlyRate = running.hourlyRate;
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

        const updated = await prisma.timeEntry.update({
            where: { id: running.id },
            data: { endTime, duration, ...(hourlyRate !== null ? { hourlyRate } : {}) },
            include: {
                task: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[TIME_ENTRIES_STOP]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
