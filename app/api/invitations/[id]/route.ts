import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/mail";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: session.user.organizationId }
    });

    if (!currentUserMember || (currentUserMember.role !== "OWNER" && currentUserMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Require OWNER or ADMIN role" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id },
      include: { organization: true }
    });

    if (!invitation || invitation.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    const inviteUrlBase = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    await sendInviteEmail({
      to: invitation.email,
      inviterName: session.user.name || "A team member",
      orgName: invitation.organization.name,
      inviteUrl: `${inviteUrlBase}/invite/${invitation.token}`,
      role: invitation.role
    });

    return NextResponse.json({ message: "Resent successfully" });
  } catch (error) {
    console.error("[INVITATIONS_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId: session.user.organizationId }
    });

    if (!currentUserMember || (currentUserMember.role !== "OWNER" && currentUserMember.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Require OWNER or ADMIN role" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: params.id }
    });

    if (!invitation || invitation.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    await prisma.invitation.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("[INVITATIONS_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
