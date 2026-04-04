import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { BillingClient } from "./billing-client";
import { Metadata } from "next";
import { PLAN_LIMITS } from "@/lib/planLimits";
import { SubscriptionPlan } from "@prisma/client";
import { Invoice } from "./billing-client";
import { getCustomerInvoices } from "@/lib/razorpay";

export const metadata: Metadata = {
  title: "Billing & Plans | Nexus",
  description: "Manage your subscription, invoices, and billing details.",
};

export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) redirect("/onboarding?new=true");
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

  const [org, membersCount, projectsCount, currentUser] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { id: true, plan: true, razorpayCustomerId: true }
    }),
    prisma.organizationMember.count({
      where: { organizationId: session.user.organizationId }
    }),
    prisma.project.count({
      where: { organizationId: session.user.organizationId }
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { aiRequestsThisMonth: true, aiRequestsResetAt: true }
    })
  ]);

  if (!org) redirect("/dashboard");

  const razorpayConfigured = !!(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );

  let invoices: Invoice[] = [];
  if (org.razorpayCustomerId && razorpayConfigured) {
    try {
      const rawInvoices = await getCustomerInvoices(org.razorpayCustomerId);
      invoices = rawInvoices.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        currency: inv.currency ?? "INR",
        status: inv.status ?? "unknown",
        date: inv.date ?? new Date().toISOString(),
        pdfUrl: inv.pdfUrl ?? null,
      }));
    } catch (error) {
      console.error("[BILLING_INVOICES_ERROR]", error);
    }
  }

  const currentPlan = org.plan as SubscriptionPlan;
  const limits = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS];

  const currentMember = await prisma.organizationMember.findFirst({
    where: {
      userId: session.user.id,
      organizationId: session.user.organizationId
    },
    select: { role: true }
  });

  const isAdminOrOwner = currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";
  const isOwner = currentMember?.role === "OWNER";

  return (
    <div className="p-8 pb-32">
      <BillingClient
        plan={currentPlan}
        usage={{
          members: membersCount,
          projects: projectsCount,
          aiRequests: currentUser?.aiRequestsThisMonth ?? 0,
        }}
        limits={limits}
        invoices={invoices}
        isOwner={isOwner}
        role={currentMember?.role}
        isAdminOrOwner={isAdminOrOwner}
        razorpayConfigured={razorpayConfigured}
      />
    </div>
  );
}
