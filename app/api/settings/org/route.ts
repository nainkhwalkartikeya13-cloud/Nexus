import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const orgSchema = z.object({
    name: z.string().min(2, "Organization name must be at least 2 characters"),
});

export async function PATCH(req: Request) {
    try {
        const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.organizationId) {
    const member = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    session.user.organizationId = member.organizationId;
    session.user.role = member.role;
  }

        // Check if user is ADMIN or OWNER
        const member = await prisma.organizationMember.findFirst({
            where: {
                userId: session.user.id,
                organizationId: session.user.organizationId,
            },
        });

        if (!member || (member.role !== "ADMIN" && member.role !== "OWNER")) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const json = await req.json();
        const { name } = orgSchema.parse(json);

        const org = await prisma.organization.update({
            where: { id: session.user.organizationId },
            data: { name },
        });

        // Create Activity Log
        await prisma.activityLog.create({
            data: {
                action: "organization_updated",
                entity: "Organization",
                entityId: org.id,
                organizationId: org.id,
                userId: session.user.id,
                metadata: { name } as Prisma.JsonObject,
            },
        });

        return NextResponse.json(org);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        return new NextResponse("Internal Error", { status: 500 });
    }
}
