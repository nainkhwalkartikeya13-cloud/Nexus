import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TasksClient } from "./tasks-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks | TeamFlow",
  description: "View and manage all your tasks across projects and team members.",
};

export default async function TasksPage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }

  const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  // Fetch data in parallel
  const [tasks, projects, members] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: session.user.organizationId,
        ...(!isOrgAdmin && {
          OR: [
            { assignedToId: session.user.id },
            {
              assignedToId: null,
              project: {
                members: {
                  some: {
                    userId: session.user.id
                  }
                }
              }
            }
          ]
        }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, name: true, color: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })
  ]);

  // Serialize for client component
  const serializedTasks = tasks.map(t => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    dueDate: t.dueDate?.toISOString() ?? null,
  }));

  const serializedMembers = members.map(m => ({
    id: m.id,
    user: {
      id: m.user.id,
      name: m.user.name,
      avatar: m.user.avatar
    }
  }));

  return (
    <div className="p-8 pb-32">
      <TasksClient
        initialTasks={serializedTasks as Parameters<typeof TasksClient>[0]["initialTasks"]}
        projects={projects}
        members={serializedMembers}
        currentUserId={session.user.id}
        organizationId={session.user.organizationId}
        userRole={session.user.role || "MEMBER"}
      />
    </div>
  );
}
