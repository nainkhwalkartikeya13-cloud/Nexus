import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const attachments = await prisma.attachment.findMany({
            where: {
                taskId: params.id,
                task: {
                    organizationId: session.user.organizationId,
                },
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(attachments);
    } catch (error) {
        console.error("[ATTACHMENTS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
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

        const task = await prisma.task.findUnique({
            where: { id: params.id },
        });

        if (!task || task.organizationId !== session.user.organizationId) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Local file save logic
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filename = `${Date.now()}-${safeName}`;
        const publicDir = path.join(process.cwd(), "public", "uploads");

        await fs.mkdir(publicDir, { recursive: true });
        await fs.writeFile(path.join(publicDir, filename), buffer);

        const fileUrl = `/uploads/${filename}`;

        const attachment = await prisma.attachment.create({
            data: {
                taskId: task.id,
                userId: session.user.id,
                name: file.name,
                url: fileUrl,
                size: file.size,
                type: file.type || "application/octet-stream",
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });

        await prisma.activityLog.create({
            data: {
                organizationId: session.user.organizationId,
                userId: session.user.id,
                action: "added_attachment",
                entity: "Task",
                entityId: task.id,
                metadata: { attachmentId: attachment.id, name: file.name },
            },
        });

        return NextResponse.json(attachment, { status: 201 });
    } catch (error) {
        console.error("[ATTACHMENTS_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
