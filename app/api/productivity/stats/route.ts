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
        const userId = searchParams.get("userId") || session.user.id;
        const orgId = session.user.organizationId;

        // Authorization check: Only Admin/Owner can view others or "all"
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
        if (userId !== session.user.id && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const where: any = { organizationId: orgId };
        if (userId !== "all") {
            where.userId = userId;
        }

        // Current week boundaries
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // This week's entries
        const weekEntries = await prisma.timeEntry.findMany({
            where: {
                ...where,
                startTime: { gte: weekStart, lt: weekEnd },
                endTime: { not: null },
            },
            include: {
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
        });

        // ── Utilization Rate ──
        const totalSeconds = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
        const billableSeconds = weekEntries
            .filter((e) => e.billable)
            .reduce((sum, e) => sum + (e.duration || 0), 0);

        const totalHours = totalSeconds / 3600;
        const billableHours = billableSeconds / 3600;
        const targetHours = 40; // standard work week
        const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;
        const weeklyProgress = (totalHours / targetHours) * 100;

        // ── Daily breakdown (for bar chart) ──
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dailyHours = dayNames.map((name, dayIdx) => {
            const dayEntries = weekEntries.filter((e) => {
                const d = new Date(e.startTime);
                return d.getDay() === dayIdx;
            });
            const hours = dayEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 3600;
            const billable = dayEntries
                .filter((e) => e.billable)
                .reduce((sum, e) => sum + (e.duration || 0), 0) / 3600;
            return { day: name, total: Math.round(hours * 100) / 100, billable: Math.round(billable * 100) / 100 };
        });

        // ── Project breakdown ──
        const projectMap: Record<string, { name: string; emoji: string; color: string; hours: number }> = {};
        weekEntries.forEach((e) => {
            const key = e.projectId || "no-project";
            if (!projectMap[key]) {
                projectMap[key] = {
                    name: e.project?.name || "No Project",
                    emoji: e.project?.emoji || "📋",
                    color: e.project?.color || "#6b7280",
                    hours: 0,
                };
            }
            projectMap[key].hours += (e.duration || 0) / 3600;
        });
        const projectBreakdown = Object.values(projectMap)
            .map((p) => ({ ...p, hours: Math.round(p.hours * 100) / 100 }))
            .sort((a, b) => b.hours - a.hours);

        // ── Today's entries ──
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // ── Recent entries (all-time, last 20) ──
        const recentEntries = await prisma.timeEntry.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                task: { select: { id: true, title: true } },
                project: { select: { id: true, name: true, emoji: true, color: true } },
            },
            orderBy: { startTime: "desc" },
            take: 20,
        });

        const todayEntries = await prisma.timeEntry.findMany({
            where: {
                ...where,
                startTime: { gte: todayStart, lte: todayEnd },
            },
        });

        const todayTotal = todayEntries
            .filter((e: any) => e.duration)
            .reduce((sum: number, e: any) => sum + (e.duration || 0), 0) / 3600;

        // ── Billable earnings this week ──
        const weeklyEarnings = weekEntries
            .filter((e) => e.billable && e.hourlyRate)
            .reduce((sum, e) => sum + ((e.duration || 0) / 3600) * (e.hourlyRate || 0), 0);

        return NextResponse.json({
            totalHours: Math.round(totalHours * 100) / 100,
            billableHours: Math.round(billableHours * 100) / 100,
            utilizationRate: Math.round(utilizationRate),
            weeklyProgress: Math.round(weeklyProgress),
            targetHours,
            dailyHours,
            projectBreakdown,
            recentEntries,
            todayTotal: Math.round(todayTotal * 100) / 100,
            weeklyEarnings: Math.round(weeklyEarnings * 100) / 100,
        });
    } catch (error) {
        console.error("[PRODUCTIVITY_STATS]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
