import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCustomer } from "@/lib/razorpay";
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

    // Re-fetch org inside a check to get the latest razorpayCustomerId (avoids race conditions)
    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId }
    });
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    // Sanitize name for Razorpay (only ASCII letters and single spaces, min 3 chars)
    let safeName = (session.user.name || org.name || "Customer")
      .replace(/[^a-zA-Z ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (safeName.length < 3) safeName = "Nexus Customer";

    const authHeader =
      "Basic " +
      Buffer.from(
        `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
      ).toString("base64");

    let customerId = org.razorpayCustomerId;

    // If we have a stored customer ID, verify it still exists on Razorpay
    if (customerId) {
      try {
        const verifyRes = await fetch(
          `https://api.razorpay.com/v1/customers/${customerId}`,
          { headers: { Authorization: authHeader } }
        );
        if (!verifyRes.ok) {
          console.warn("[RAZORPAY_CHECKOUT] Stored customer", customerId, "is invalid (status", verifyRes.status, "), will re-create");
          customerId = null;
          // Clear the stale ID from DB
          await prisma.organization.update({
            where: { id: org.id },
            data: { razorpayCustomerId: null }
          });
        }
      } catch {
        console.warn("[RAZORPAY_CHECKOUT] Could not verify customer", customerId);
      }
    }

    if (!customerId) {
      console.log("[RAZORPAY_CHECKOUT] Creating new customer for org", org.id);
      let customer;
      try {
        customer = await createCustomer(
          session.user.email || "billing@nexus.app",
          safeName
        );
      } catch (custErr: any) {
        console.error("[RAZORPAY_CHECKOUT] Customer creation failed:", JSON.stringify({
          message: custErr?.message,
          statusCode: custErr?.statusCode,
          error: custErr?.error,
        }));
        throw custErr;
      }
      customerId = customer.id;

      // Use updateMany with a condition to avoid race: only set if still null
      const updated = await prisma.organization.updateMany({
        where: { id: org.id, razorpayCustomerId: null },
        data: { razorpayCustomerId: customerId }
      });

      // If another request already set it, use that one
      if (updated.count === 0) {
        const freshOrg = await prisma.organization.findUnique({
          where: { id: org.id },
          select: { razorpayCustomerId: true }
        });
        if (freshOrg?.razorpayCustomerId) {
          customerId = freshOrg.razorpayCustomerId;
        }
      }
    }

    console.log("[RAZORPAY_CHECKOUT] Creating subscription with planId:", planId, "customerId:", customerId);

    // Create Razorpay subscription via REST API (avoids SDK type issues with customer_id)
    const subRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        plan_id: planId,
        customer_id: customerId,
        total_count: 120,
        customer_notify: 1,
        notes: {
          organizationId: org.id,
          plan,
        },
      }),
    });

    if (!subRes.ok) {
      const subError = await subRes.json().catch(() => null);
      console.error("[RAZORPAY_CHECKOUT] Subscription creation failed:", JSON.stringify({
        status: subRes.status,
        error: subError,
        planId,
        customerId,
      }));
      const errMsg = subError?.error?.description || `Subscription creation failed (HTTP ${subRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: subRes.status >= 400 && subRes.status < 600 ? subRes.status : 500 });
    }

    const subscription = await subRes.json();

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
    console.error("[RAZORPAY_CHECKOUT_ERROR]", JSON.stringify({
      message: error?.message,
      statusCode: error?.statusCode,
      error: error?.error,
      stack: error?.stack?.slice(0, 500),
    }, null, 2));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    // Extract error message from Razorpay SDK if available
    const errorMessage =
      error?.error?.description ||
      error?.error?.reason ||
      error?.message ||
      "Internal Error";

    const statusCode = error?.statusCode || 500;

    return NextResponse.json({ error: errorMessage }, { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 });
  }
}
