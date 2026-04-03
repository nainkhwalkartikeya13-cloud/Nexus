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
        if (!sub) {
          console.warn("[RAZORPAY_WEBHOOK] No subscription entity in", event.event);
          break;
        }

        const organizationId = sub.notes?.organizationId;
        const plan = sub.notes?.plan;

        if (!organizationId || !plan) {
          console.warn("[RAZORPAY_WEBHOOK] Missing organizationId or plan in notes for subscription", sub.id);
          break;
        }

        const periodEnd = sub.current_end
          ? new Date(sub.current_end * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: 30 days

        // Use transaction to keep Organization and Subscription in sync
        await prisma.$transaction([
          prisma.organization.update({
            where: { id: organizationId },
            data: {
              razorpaySubscriptionId: sub.id,
              plan,
            }
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
            }
          }),
        ]);

        // Notify owners about successful activation
        try {
          const owners = await prisma.organizationMember.findMany({
            where: { organizationId, role: "OWNER" }
          });
          await Promise.all(owners.map((owner) =>
            createNotification({
              userId: owner.userId,
              organizationId,
              type: "PAYMENT_SUCCESS",
              message: `Your subscription has been activated! You are now on the ${plan} plan.`,
              link: "/dashboard/billing"
            })
          ));
        } catch (notifErr) {
          console.warn("[RAZORPAY_WEBHOOK] Failed to send activation notification", notifErr);
        }

        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const sub = event.payload?.subscription?.entity;
        if (!sub) {
          console.warn("[RAZORPAY_WEBHOOK] No subscription entity in", event.event);
          break;
        }

        const org = await prisma.organization.findFirst({
          where: { razorpaySubscriptionId: sub.id }
        });

        if (!org) {
          console.warn("[RAZORPAY_WEBHOOK] No org found for subscription", sub.id);
          break;
        }

        await prisma.$transaction([
          prisma.organization.update({
            where: { id: org.id },
            data: { plan: "FREE", razorpaySubscriptionId: null }
          }),
          prisma.subscription.update({
            where: { organizationId: org.id },
            data: { status: "CANCELED" }
          }),
        ]);

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

        break;
      }

      case "payment.failed": {
        const payment = event.payload?.payment?.entity;
        if (!payment) {
          console.warn("[RAZORPAY_WEBHOOK] No payment entity in payment.failed");
          break;
        }

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
              message: "Payment failed — please update your billing information.",
              link: "/dashboard/billing"
            })
          ));
        } else {
          console.warn("[RAZORPAY_WEBHOOK] No org found for failed payment customer", payment.customer_id);
        }
        break;
      }

      default:
        console.log("[RAZORPAY_WEBHOOK] Unhandled event:", event.event);
    }
  } catch (error) {
    console.error("[RAZORPAY_WEBHOOK_ERROR]", event.event, error);
  }

  return new NextResponse(null, { status: 200 });
}
