import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Navbar } from "@/components/dashboard/Navbar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { PageTransition } from "@/components/dashboard/PageTransition";
import { ForceSignOut } from "@/components/auth/force-sign-out";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Verify if the user has an organization
  let activeOrgId = session.user.organizationId;

  if (!activeOrgId) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id }
    });

    if (!member) {
      redirect("/onboarding?new=true");
    }

    // Fallback if session is missing the organizationId but they have one in the DB (for OAuth users)
    activeOrgId = member.organizationId;
  }

  // Fetch current organization data for the sidebar
  const orgFallback = { id: "", name: "Personal Workspace", plan: "FREE" };
  let currentOrganization = orgFallback;

  if (activeOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: activeOrgId },
      select: { id: true, name: true, plan: true },
    });
    if (org) {
      currentOrganization = org as any;
    } else {
      return <ForceSignOut />;
    }
  }

  // Fetch all organizations the user belongs to for the switcher
  const userOrganizations = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: {
      organization: {
        select: { id: true, name: true, logo: true }
      }
    }
  });

  const organizations = userOrganizations.map(uo => ({
    id: uo.organization.id,
    name: uo.organization.name,
    logo: uo.organization.logo,
    role: uo.role
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* Sidebar (hidden on mobile) */}
      <Sidebar
        user={session.user}
        organization={currentOrganization as any}
        organizations={organizations}
      />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden md:ml-[240px] max-md:mb-[64px] relative z-10">
        <Navbar user={session.user} />

        <main className="flex-1 overflow-auto scrollbar-thin relative z-0">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Mobile Navigation (hidden on desktop) */}
      <MobileNav />

      {/* Global Elements */}
      <div className="noise" />
      <div className="fixed inset-0 pointer-events-none bg-dot-grid opacity-50 z-[-1]" />
      <div className="glow-ambient-light" />
      <div className="glow-ambient-dark" />
    </div>
  );
}
