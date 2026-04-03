import { Suspense } from "react";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import { getDashboardData } from "@/lib/dashboard-data";
import DashboardLoading from "./loading";

const DashboardContent = dynamic(() => import("./dashboard-content").then(mod => mod.DashboardContent), {
  loading: () => <DashboardLoading />,
});

export const metadata: Metadata = {
  title: "Dashboard | Nexus",
  description: "Overview of your workspace performance and active tasks.",
};

export default async function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDataLoader />
    </Suspense>
  );
}

async function DashboardDataLoader() {
  const data = await getDashboardData();

  // Serialize dates for client components
  const serialized = {
    session: {
      ...data.session,
      user: {
        ...data.session.user,
        name: data.session.user.name || "User",
        email: data.session.user.email || "",
        avatar: data.session.user.avatar || null,
        organizationId: data.session.user.organizationId || null,
        role: data.session.user.role || null,
      }
    },
    metrics: data.metrics,
    projectProgress: data.projectProgress,
    activity: data.activity.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    myTasks: data.myTasks.map((t) => ({
      ...t,
      dueDate: t.dueDate?.toISOString() ?? null,
    })),
    completionData: data.completionData,
    statusBreakdown: data.statusBreakdown,
    userWorkload: data.userWorkload,
  };

  return <DashboardContent data={serialized} />;
}
