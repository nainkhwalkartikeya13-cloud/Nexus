import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const confirmSchema = z.object({
  subscriptionId: z.string(),
  plan: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 400 });
    }

    const json = await req.json();
    const { subscriptionId, plan } = confirmSchema.parse(json);

    // Verify the subscription status directly with Razorpay
    const authHeader =
      "Basic " +
      Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

    const subRes = await fetch(
      `https://api.razorpay.com/v1/subscriptions/${subscriptionId}`,
      { headers: { Authorization: authHeader } }
    );

    if (!subRes.ok) {
      console.error("[BILLING_CONFIRM] Failed to fetch subscription", subscriptionId, subRes.status);
      return NextResponse.json({ error: "Could not verify subscription" }, { status: 400 });
    }

    const sub = await subRes.json();

    // Only activate if the subscription is in a valid state
    if (!["active", "authenticated", "created"].includes(sub.status)) {
      console.warn("[BILLING_CONFIRM] Subscription", subscriptionId, "status is", sub.status);
      return NextResponse.json({ error: `Subscription is ${sub.status}, not active` }, { status: 400 });
    }

    const organizationId = session.user.organizationId;

    const periodEnd = sub.current_end
      ? new Date(sub.current_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Update organization plan and subscription record
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: organizationId },
        data: {
          razorpaySubscriptionId: sub.id,
          plan: plan as any,
        },
      }),
      prisma.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          razorpaySubscriptionId: sub.id,
          razorpayPlanId: sub.plan_id,
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
        },
        update: {
          razorpaySubscriptionId: sub.id,
          razorpayPlanId: sub.plan_id,
          status: "ACTIVE",
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    console.log("[BILLING_CONFIRM] Plan updated to", plan, "for org", organizationId);

    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error("[BILLING_CONFIRM_ERROR]", error?.message || error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error?.message || "Internal Error" }, { status: 500 });
  }
}
