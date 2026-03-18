import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
    organizationId: z.string(),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const { organizationId } = schema.parse(json);

        // Verify user is actually a member of this organization
        const membership = await prisma.organizationMember.findFirst({
            where: {
                userId: session.user.id,
                organizationId,
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Update active organization
        await prisma.user.update({
            where: { id: session.user.id },
            data: { activeOrganizationId: organizationId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[ACTIVE_ORG_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
