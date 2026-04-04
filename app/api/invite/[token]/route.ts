import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { checkMemberLimit, PlanLimitError } from "@/lib/planLimits";

// GET /api/invite/[token] — validate a token and return invite info
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true, logo: true } },
        invitedBy: { select: { name: true, avatar: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organization: invitation.organization,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("[INVITE_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/invite/[token] — accept the invitation
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if already a member
    const existingMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
      },
    });

    if (existingMember) {
      // Mark accepted anyway
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
      return NextResponse.json({
        success: true,
        message: "You are already a member of this organization",
      });
    }

    // Check member limit before accepting
    try {
      await checkMemberLimit(invitation.organizationId);
    } catch (err) {
      if (err instanceof PlanLimitError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      throw err;
    }

    // Create membership and mark invitation accepted in a transaction
    await prisma.$transaction([
      prisma.organizationMember.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
      prisma.activityLog.create({
        data: {
          organizationId: invitation.organizationId,
          userId: session.user.id,
          action: "joined",
          entity: "organization",
          entityId: invitation.organizationId,
          metadata: { via: "invitation", role: invitation.role },
        },
      }),
    ]);

    // Notify all org admins/owners about the new member (fire-and-forget)
    prisma.organizationMember.findMany({
      where: { organizationId: invitation.organizationId, role: { in: ["OWNER", "ADMIN"] } }
    }).then((admins) => {
      Promise.all(admins.map((admin) =>
        createNotification({
          userId: admin.userId,
          organizationId: invitation.organizationId,
          type: "MEMBER_JOINED",
          message: `${session.user.name ?? session.user.email} joined the team`,
          link: "/dashboard/members",
        })
      ));
    }).catch(() => { });

    return NextResponse.json({
      success: true,
      organizationName: invitation.organization.name,
    });
  } catch (error) {
    console.error("[INVITE_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
