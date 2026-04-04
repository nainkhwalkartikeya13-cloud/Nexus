import { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClient } from "./projects-client";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Projects | Nexus",
  description: "Manage and track your workspace initiatives and projects.",
};

export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) redirect("/onboarding?new=true");
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

  const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

  const projectWhere = isOrgAdmin
    ? { organizationId: session.user.organizationId }
    : {
      organizationId: session.user.organizationId,
      members: { some: { userId: session.user.id } }
    };

  const projects = await prisma.project.findMany({
    where: projectWhere,
    include: {
      _count: {
        select: { tasks: true }
      },
      tasks: {
        where: { status: "DONE" },
        select: { id: true }
      },
      members: {
        select: {
          user: {
            select: { name: true, avatar: true }
          }
        },
        take: 5
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  const serializedProjects = projects.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    taskCount: p._count.tasks,
    doneCount: p.tasks.length,
    members: p.members.map(m => ({
      name: m.user.name || "User",
      image: m.user.avatar
    }))
  }));

  return <ProjectsClient initialProjects={serializedProjects} />;
}
