import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const rateSchema = z.object({
    hourlyRate: z.number().min(0).nullable(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins/owners can set rates
        const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id: memberId } = await params;
        const json = await req.json();
        const data = rateSchema.parse(json);

        // Verify the member belongs to this org
        const member = await prisma.organizationMember.findFirst({
            where: {
                id: memberId,
                organizationId: session.user.organizationId,
            },
        });

        if (!member) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        const updated = await prisma.organizationMember.update({
            where: { id: memberId },
            data: { hourlyRate: data.hourlyRate as number | undefined },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatar: true },
                },
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[MEMBER_RATE_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
