import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { razorpay, createCustomer } from "@/lib/razorpay";
import { SubscriptionPlan } from "@prisma/client";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.nativeEnum(SubscriptionPlan),
});

// Map plans to Razorpay Plan IDs (configure these in your .env)
function getRazorpayPlanId(plan: SubscriptionPlan): string | undefined {
  const planMap: Partial<Record<SubscriptionPlan, string | undefined>> = {
    STARTER: process.env.RAZORPAY_STARTER_PLAN_ID,
    PRO: process.env.RAZORPAY_PRO_PLAN_ID,
    ENTERPRISE: process.env.RAZORPAY_ENTERPRISE_PLAN_ID,
  };
  return planMap[plan];
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { error: "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file." },
        { status: 400 }
      );
    }

    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: session.user.organizationId }
    });

    if (!orgMember || (orgMember.role !== "OWNER" && orgMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Only owners and admins can manage billing." }, { status: 403 });
    }

    const json = await req.json();
    const { plan } = checkoutSchema.parse(json);

    if (plan === "FREE") {
      return NextResponse.json({ error: "Cannot checkout for FREE plan." }, { status: 400 });
    }

    if (plan === "ENTERPRISE") {
      return NextResponse.json({ error: "Contact sales for Enterprise plan." }, { status: 400 });
    }

    const planId = getRazorpayPlanId(plan);
    if (!planId || planId === "plan_...") {
      return NextResponse.json(
        { error: `You haven't configured the Razorpay Plan ID for the ${plan} plan yet. Please replace "plan_..." with your actual Plan ID from the Razorpay Dashboard.` },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId }
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Get or create Razorpay customer
    let safeName = (session.user.name || org.name || "Customer")
      .replace(/[^a-zA-Z ]/g, "") // Keep only ASCII letters and spaces
      .replace(/\s+/g, " ")       // Collapse multiple spaces
      .trim();
    if (safeName.length < 3) safeName = "Nexus Customer";

    let customerId = org.razorpayCustomerId;
    if (!customerId) {
      const customer = await createCustomer(
        session.user.email || "billing@nexus.app",
        safeName
      );
      customerId = customer.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { razorpayCustomerId: customerId }
      });
    } else {
      // Update existing customer's name on Razorpay to ensure it's valid
      // (fixes customers created before name sanitization was added)
      try {
        await razorpay().customers.edit(customerId, { name: safeName });
      } catch {
        // Non-critical — log and continue
        console.warn("[RAZORPAY] Could not update customer name for", customerId);
      }
    }

    // Create Razorpay subscription
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await razorpay().subscriptions.create({
      plan_id: planId,
      customer_id: customerId,
      total_count: 120,
      customer_notify: 1,
      notes: {
        organizationId: org.id,
        plan,
      },
    } as Parameters<ReturnType<typeof razorpay>["subscriptions"]["create"]>[0]);

    return NextResponse.json({
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID,
      organizationId: org.id,
      plan,
      prefill: {
        name: safeName,
        email: session.user.email || "billing@nexus.app",
      }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[RAZORPAY_CHECKOUT_ERROR]", error);

    // Extract error message from Razorpay SDK if available
    const errorMessage = error?.error?.description || error?.message || "Internal Error";

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
