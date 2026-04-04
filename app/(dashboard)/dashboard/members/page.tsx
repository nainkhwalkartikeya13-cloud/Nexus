import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MembersClient } from "./members-client";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team Members | Nexus",
  description: "Manage your team members, roles, and invitations.",
};

export default async function MembersPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) redirect("/onboarding?new=true");
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

  const [org, members, invitations] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, name: true, plan: true }
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } }
      },
      orderBy: { joinedAt: "asc" }
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: "PENDING"
      },
      include: {
        invitedBy: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  if (!org) redirect("/dashboard");

  const serializedMembers = members.map(m => ({
    ...m,
    joinedAt: m.joinedAt.toISOString()
  }));

  const serializedInvitations = invitations.map(i => ({
    ...i,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt.toISOString()
  }));

  const planLimit = PLAN_LIMITS[org.plan as keyof typeof PLAN_LIMITS].members;

  return (
    <div className="p-8 pb-32">
      <MembersClient
        initialMembers={serializedMembers}
        initialInvitations={serializedInvitations}
        orgName={org.name}
        plan={org.plan}
        planLimit={planLimit}
        currentUserId={session.user.id}
      />
    </div>
  );
}
