import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/projects/:id/members
 * Body: { userId: string }
 * Adds a member to the project. The user must belong to the same org.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Verify project belongs to org
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project || project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify current user is OWNER or ADMIN (at project or organization level)
    const currentMemberRole = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.user.id },
      select: { role: true }
    });

    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    const canManage = isOrgAdmin || (currentMemberRole && (currentMemberRole.role === "OWNER" || currentMemberRole.role === "ADMIN"));

    if (!canManage) {
      return NextResponse.json({ error: "Forbidden: Only Project Owners, Admins, or Organization Admins can add members" }, { status: 403 });
    }

    // Verify user is member of the org
    const orgMember = await prisma.organizationMember.findFirst({
      where: { organizationId: session.user.organizationId, userId },
    });

    if (!orgMember) {
      return NextResponse.json({ error: "User is not in your organization" }, { status: 400 });
    }

    // Check if already a project member
    const existing = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (existing) {
      return NextResponse.json({ error: "User is already a project member" }, { status: 409 });
    }

    const member = await prisma.projectMember.create({
      data: { projectId, userId },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } }
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("[PROJECT_MEMBERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/:id/members
 * Body: { userId: string }
 * Removes a member from the project.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project || project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // RBAC check
    const currentMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.user.id }
    });

    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";
    const targetMember = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    });

    if (!currentMember || !targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (currentMember?.userId !== targetMember.userId) { // If not leaving themselves
      if (!isOrgAdmin) {
        if (!currentMember || currentMember.role === "MEMBER") {
          return NextResponse.json({ error: "Forbidden: Members cannot remove others" }, { status: 403 });
        }
        if (currentMember.role === "ADMIN" && (targetMember.role === "OWNER" || targetMember.role === "ADMIN")) {
          return NextResponse.json({ error: "Forbidden: Admins can only remove Members" }, { status: 403 });
        }
      }
    }

    await prisma.projectMember.deleteMany({
      where: { projectId, userId },
    });

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("[PROJECT_MEMBERS_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/projects/:id/members
 * Body: { userId: string, role: string }
 * Updates a member's role
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const { userId, role } = await req.json();

    if (!userId || !["OWNER", "ADMIN", "MEMBER"].includes(role)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project || project.organizationId !== session.user.organizationId) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const currentMember = await prisma.projectMember.findFirst({
      where: { projectId, userId: session.user.id },
    });
    const targetMember = await prisma.projectMember.findFirst({
      where: { projectId, userId },
    });

    if (!currentMember || !targetMember) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const isOrgAdmin = session.user.role === "OWNER" || session.user.role === "ADMIN";

    if (!isOrgAdmin) {
      if (!currentMember || currentMember.role === "MEMBER") {
        return NextResponse.json({ error: "Forbidden: Members cannot change roles" }, { status: 403 });
      }

      if (currentMember.role === "ADMIN") {
        if (targetMember.role === "OWNER") {
          return NextResponse.json({ error: "Forbidden: Admins cannot change Owner roles" }, { status: 403 });
        }
        if (role === "OWNER") {
          return NextResponse.json({ error: "Forbidden: Admins cannot grant Owner role" }, { status: 403 });
        }
      }
    }

    const updated = await prisma.projectMember.updateMany({
      where: { projectId, userId },
      data: { role: role as any },
    });

    return NextResponse.json({ message: "Role updated" });
  } catch (error) {
    console.error("[PROJECT_MEMBERS_PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
