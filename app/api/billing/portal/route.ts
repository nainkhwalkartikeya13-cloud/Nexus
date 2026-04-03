import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";

// Cancel the current subscription
export async function POST() {
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

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId }
    });

    if (!org?.razorpaySubscriptionId) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    await razorpay().subscriptions.cancel(org.razorpaySubscriptionId);

    // Use transaction to keep Organization and Subscription in sync
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: org.id },
        data: { plan: "FREE", razorpaySubscriptionId: null }
      }),
      prisma.subscription.updateMany({
        where: { organizationId: org.id },
        data: { status: "CANCELED" }
      }),
    ]);

    return NextResponse.json({ success: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("[RAZORPAY_PORTAL_POST]", error);
    const errorMessage = error?.error?.description || error?.message || "Could not cancel subscription";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
