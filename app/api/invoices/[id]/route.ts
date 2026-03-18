import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateInvoiceSchema = z.object({
    clientId: z.string().optional(),
    currency: z.string().optional(),
    items: z
        .array(
            z.object({
                description: z.string().min(1),
                quantity: z.number().positive(),
                rate: z.number().min(0),
            })
        )
        .optional(),
    taxRate: z.number().min(0).max(100).optional(),
    discount: z.number().min(0).optional(),
    notes: z.string().nullable().optional(),
    dueDate: z.string().optional(),
    status: z.enum(["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]).optional(),
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const invoice = await prisma.invoice.findFirst({
            where: { id, organizationId: session.user.organizationId },
            include: {
                client: true,
                items: true,
                createdBy: { select: { name: true, email: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        return NextResponse.json(invoice);
    } catch (error) {
        console.error("[INVOICE_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const data = updateInvoiceSchema.parse(json);

        // Check invoice belongs to org
        const existing = await prisma.invoice.findFirst({
            where: { id, organizationId: session.user.organizationId },
        });
        if (!existing) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Recalculate if items changed
        let updateData: Record<string, unknown> = {};
        if (data.items) {
            // Delete old items and recreate
            await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });

            const items = data.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.quantity * item.rate,
            }));
            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
            const discount = data.discount ?? existing.discount;
            const taxRate = data.taxRate ?? existing.taxRate;
            const taxAmount = (subtotal * taxRate) / 100;
            const total = subtotal + taxAmount - discount;

            await prisma.invoiceItem.createMany({
                data: items.map((item) => ({ ...item, invoiceId: id })),
            });

            updateData = { ...updateData, subtotal, taxAmount, discount, taxRate, total };
        } else if (data.taxRate !== undefined || data.discount !== undefined) {
            const taxRate = data.taxRate ?? existing.taxRate;
            const discount = data.discount ?? existing.discount;
            const taxAmount = (existing.subtotal * taxRate) / 100;
            const total = existing.subtotal + taxAmount - discount;
            updateData = { ...updateData, taxRate, discount, taxAmount, total };
        }

        if (data.clientId) updateData.clientId = data.clientId;
        if (data.currency) updateData.currency = data.currency;
        if (data.notes !== undefined) updateData.notes = data.notes;
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
        if (data.status) {
            updateData.status = data.status;
            if (data.status === "PAID") updateData.paidAt = new Date();
            if (data.status === "SENT" && !existing.sentAt) updateData.sentAt = new Date();
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: { items: true, client: true },
        });

        return NextResponse.json(invoice);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[INVOICE_PUT]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const result = await prisma.invoice.deleteMany({
            where: { id, organizationId: session.user.organizationId },
        });

        if (result.count === 0) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[INVOICE_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
