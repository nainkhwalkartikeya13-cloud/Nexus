import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Nexus",
  description: "Manage your account, workspace preferences, and security settings.",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    redirect("/login");
  }

  const [user, organization, member] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        notificationPreferences: true,
      }
    }),
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
      }
    }),
    prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
      },
      select: {
        role: true,
      }
    }),
  ]);

  if (!user || !organization || !member) {
    redirect("/dashboard");
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <SettingsClient
        user={{ ...user, notificationPreferences: user.notificationPreferences as Record<string, boolean> }}
        organization={organization}
        isAdmin={member.role === "ADMIN" || member.role === "OWNER"}
        isOwner={member.role === "OWNER"}
      />
    </div>
  );
}
