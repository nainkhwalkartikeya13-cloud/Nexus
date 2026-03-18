import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createOrgSchema = z.object({
    name: z.string().min(2, "Workspace name must be at least 2 characters").max(50, "Workspace name limit is 50 characters"),
});

function generateSlug(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "") + "-" + Math.random().toString(36).substring(2, 8);
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const json = await req.json();
        const body = createOrgSchema.parse(json);

        const slug = generateSlug(body.name);

        const organization = await prisma.organization.create({
            data: {
                name: body.name,
                slug,
                members: {
                    create: {
                        userId: session.user.id,
                        role: "OWNER", // Note: Matches OrgMemberRole enum
                    },
                },
            },
        });

        return NextResponse.json(organization);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.issues), { status: 422 });
        }
        console.error("[ORGANIZATIONS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
