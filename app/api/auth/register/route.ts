import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateSlug } from "@/lib/utils";
import { SubscriptionPlan, OrgMemberRole } from "@prisma/client";
import { sendWelcomeEmail } from "@/lib/mail";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  orgName: z.string().min(2),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = registerSchema.parse(json);

    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, message: "Email already taken." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const hashedPassword = await bcrypt.hash(body.password, 12);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: hashedPassword,
        },
      });

      const baseSlug = generateSlug(body.orgName);
      const randomSuffix = Math.floor(Math.random() * 10000).toString();
      const slug = `${baseSlug}-${randomSuffix}`;

      const org = await tx.organization.create({
        data: {
          name: body.orgName,
          slug: slug,
          plan: SubscriptionPlan.FREE,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: OrgMemberRole.OWNER,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          action: "org_created",
          entity: "Organization",
          entityId: org.id,
        },
      });
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail({
      to: body.email,
      name: body.name,
      orgName: body.orgName,
    }).catch(err => console.error("Failed to send welcome email:", err));

    return new Response(
      JSON.stringify({ success: true, message: "Account created successfully" }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, message: (error as z.ZodError).issues[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
