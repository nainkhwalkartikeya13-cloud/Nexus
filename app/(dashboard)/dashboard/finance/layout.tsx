import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user?.id) redirect("/login");
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) redirect("/onboarding?new=true");
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

    // Restrict the finance dashboard strictly to Owners and Admins
    if (session.user.role === "MEMBER") {
        redirect("/dashboard");
    }

    return <>{children}</>;
}
