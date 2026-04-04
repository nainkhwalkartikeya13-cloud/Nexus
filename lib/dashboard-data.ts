import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/* ── Helper: get authenticated session or redirect ── */
async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id }
    });
    if (!member) {
      redirect("/onboarding?new=true");
    }
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

  return session;
}

/* ── Types ── */
export interface DashboardMetrics {
  totalProjects: number;
  totalTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
  teamMembers: number;
  projectTrend: number;
  taskTrend: number;
  completionTrend: number;
}

export interface ProjectProgress {
  id: string;
  name: string;
  emoji: string;
  color: string;
  totalTasks: number;
  doneTasks: number;
  members: { name: string; image: string | null }[];
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  user: { name: string; avatar: string | null };
}

export interface MyTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: { id: string; name: string; emoji: string; color: string };
}

export interface CompletionDataPoint {
  date: string; // "MMM dd"
  count: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  color: string;
}

export interface UserWorkload {
  name: string;
  tasks: number;
}

/* ── Fetch all dashboard data ── */
export async function getDashboardData() {
  const session = await requireSession();
  const orgId = session.user.organizationId!;
  const userId = session.user.id;
  const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  const projectWhere = isOrgAdmin
    ? { organizationId: orgId }
    : { organizationId: orgId, members: { some: { userId } } };

  const taskWhere = isOrgAdmin
    ? { organizationId: orgId }
    : { organizationId: orgId, project: { members: { some: { userId } } } };

  const now = new Date();

  // Start of current week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  // 30 days ago
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Previous week window for trend calculations
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [
    totalProjects,
    totalTasks,
    completedThisWeek,
    overdueTasks,
    teamMembers,
    projects,
    activityLogs,
    myTasks,
    completedTasksLast30,
    statusCounts,
    prevWeekProjects,
    prevWeekActiveTasks,
    prevWeekCompleted,
    workloadRaw,
  ] = await Promise.all([
    // 1. Total projects
    prisma.project.count({ where: projectWhere }),

    // 2. Total tasks (active = not DONE)
    prisma.task.count({
      where: { ...taskWhere, status: { not: "DONE" } },
    }),

    // 3. Tasks completed this week
    prisma.task.count({
      where: {
        ...taskWhere,
        status: "DONE",
        updatedAt: { gte: weekStart },
      },
    }),

    // 4. Overdue tasks
    prisma.task.count({
      where: {
        ...taskWhere,
        status: { not: "DONE" },
        dueDate: { lt: now },
      },
    }),

    // 5. Team members count
    prisma.organizationMember.count({ where: { organizationId: orgId } }),

    // 6. Project progress
    prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        emoji: true,
        color: true,
        tasks: {
          select: { status: true },
        },
        members: {
          select: {
            user: { select: { name: true, avatar: true } },
          },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // 7. Activity log (last 10)
    prisma.activityLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true, avatar: true } },
      },
    }),

    // 8. My tasks (assigned to me, not done, due soonest)
    prisma.task.findMany({
      where: {
        organizationId: orgId,
        assignedToId: userId,
        status: { not: "DONE" },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      take: 5,
      include: {
        project: { select: { id: true, name: true, emoji: true, color: true } },
      },
    }),

    // 9. Completed tasks per day (last 30 days) for area chart
    prisma.task.findMany({
      where: {
        ...taskWhere,
        status: "DONE",
        updatedAt: { gte: thirtyDaysAgo },
      },
      select: { updatedAt: true },
    }),

    // 10. Status breakdown for donut chart
    prisma.task.groupBy({
      by: ["status"],
      where: taskWhere,
      _count: { _all: true },
    }),

    // 11. Previous week project count (for trend)
    prisma.project.count({
      where: { ...projectWhere, createdAt: { lt: weekStart } },
    }),

    // 12. Previous week active tasks (for trend)
    prisma.task.count({
      where: { ...taskWhere, status: { not: "DONE" }, createdAt: { lt: weekStart } },
    }),

    // 13. Previous week completed tasks (for trend)
    prisma.task.count({
      where: {
        ...taskWhere,
        status: "DONE",
        updatedAt: { gte: prevWeekStart, lt: weekStart },
      },
    }),

    // 14. User Workload
    prisma.user.findMany({
      where: { members: { some: { organizationId: orgId } } },
      select: {
        name: true,
        _count: {
          select: {
            assignedTasks: {
              where: { organizationId: orgId, status: { not: "DONE" } },
            },
          },
        },
      },
    }),
  ]);

  /* ── Transform project progress ── */
  const projectProgress: ProjectProgress[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    totalTasks: p.tasks.length,
    doneTasks: p.tasks.filter((t) => t.status === "DONE").length,
    members: p.members.map((m) => ({
      name: m.user.name,
      image: m.user.avatar,
    })),
  }));

  /* ── Transform activity entries ── */
  const activity: ActivityEntry[] = activityLogs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata as Record<string, unknown> | null,
    createdAt: log.createdAt,
    user: { name: log.user.name, avatar: log.user.avatar },
  }));

  /* ── Transform my tasks ── */
  const myTasksList: MyTask[] = myTasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    project: {
      id: t.project.id,
      name: t.project.name,
      emoji: t.project.emoji,
      color: t.project.color,
    },
  }));

  /* ── Build 30-day completion chart data ── */
  const dayMap = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap.set(key, 0);
  }
  for (const task of completedTasksLast30) {
    const key = task.updatedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    if (dayMap.has(key)) {
      dayMap.set(key, dayMap.get(key)! + 1);
    }
  }
  const completionData: CompletionDataPoint[] = Array.from(dayMap.entries()).map(
    ([date, count]) => ({ date, count })
  );

  /* ── Status breakdown ── */
  const statusColorMap: Record<string, string> = {
    TODO: "#64748b",
    IN_PROGRESS: "#6366f1",
    IN_REVIEW: "#f59e0b",
    DONE: "#10b981",
  };
  const statusBreakdown: StatusBreakdown[] = statusCounts.map((s) => ({
    status: s.status,
    count: s._count._all,
    color: statusColorMap[s.status] ?? "#64748b",
  }));

  // Compute week-over-week trend percentages
  const calcTrend = (current: number, previous: number) =>
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : current > 0 ? 100 : 0;

  const metrics: DashboardMetrics = {
    totalProjects,
    totalTasks,
    completedThisWeek,
    overdueTasks,
    teamMembers,
    projectTrend: calcTrend(totalProjects, prevWeekProjects),
    taskTrend: calcTrend(totalTasks, prevWeekActiveTasks),
    completionTrend: calcTrend(completedThisWeek, prevWeekCompleted),
  };

  const userWorkload: UserWorkload[] = workloadRaw
    .map(u => ({ name: u.name, tasks: u._count.assignedTasks }))
    .filter(u => u.tasks > 0)
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 5); // top 5

  return {
    session,
    metrics,
    projectProgress,
    activity,
    myTasks: myTasksList,
    completionData,
    statusBreakdown,
    userWorkload,
  };
}
