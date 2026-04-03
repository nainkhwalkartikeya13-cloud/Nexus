import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();

  // Verify Razorpay webhook signature
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers.get("x-razorpay-signature");

  if (!webhookSecret) {
    console.error("[RAZORPAY_WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not set. Rejecting request.");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!razorpaySignature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: { event: string; payload: any };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged": {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;

        const organizationId = sub.notes?.organizationId;
        const plan = sub.notes?.plan;

        if (!organizationId || !plan) break;

        const periodEnd = sub.current_end
          ? new Date(sub.current_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days

        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            razorpaySubscriptionId: sub.id,
            plan,
          }
        });

        await prisma.subscription.upsert({
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
          }
        });

        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const sub = event.payload?.subscription?.entity;
        if (!sub) break;

        const org = await prisma.organization.findFirst({
          where: { razorpaySubscriptionId: sub.id }
        });

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { plan: "FREE", razorpaySubscriptionId: null }
          });

          await prisma.subscription.update({
            where: { organizationId: org.id },
            data: { status: "CANCELED" }
          });

          const owners = await prisma.organizationMember.findMany({
            where: { organizationId: org.id, role: "OWNER" }
          });

          await Promise.all(owners.map((owner) =>
            createNotification({
              userId: owner.userId,
              organizationId: org.id,
              type: "PAYMENT_FAILED",
              message: "Your subscription was cancelled. Downgraded to FREE plan.",
              link: "/dashboard/billing"
            })
          ));
        }
        break;
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        if (!payment) break;

        // Find org by razorpay customer id if present
        const org = payment.customer_id
          ? await prisma.organization.findFirst({
            where: { razorpayCustomerId: payment.customer_id }
          })
          : null;

        if (org) {
          await prisma.subscription.updateMany({
            where: { organizationId: org.id, status: "ACTIVE" },
            data: { status: "PAST_DUE" }
          });

          const owners = await prisma.organizationMember.findMany({
            where: { organizationId: org.id, role: "OWNER" }
          });

          await Promise.all(owners.map((owner) =>
            createNotification({
              userId: owner.userId,
              organizationId: org.id,
              type: "PAYMENT_FAILED",
              message: "Payment failed - please update your billing information.",
              link: "/dashboard/billing"
            })
          ));
        }
        break;
      }
    }
  } catch (error) {
    console.error("[RAZORPAY_WEBHOOK_ERROR]", error);
  }

  return new NextResponse(null, { status: 200 });
}
