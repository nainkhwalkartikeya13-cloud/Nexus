import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { generateInvoiceNumber } from "@/lib/currency";

const invoiceItemSchema = z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    rate: z.number().min(0),
});

const createInvoiceSchema = z.object({
    clientId: z.string().min(1, "Client is required"),
    currency: z.string().default("INR"),
    items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
    taxRate: z.number().min(0).max(100).default(0),
    discount: z.number().min(0).default(0),
    notes: z.string().optional(),
    dueDate: z.string().min(1, "Due date is required"),
    status: z.enum(["DRAFT", "SENT"]).default("DRAFT"),
});

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const clientId = searchParams.get("clientId");

        const where: Record<string, unknown> = {
            organizationId: session.user.organizationId,
        };
        if (status) where.status = status;
        if (clientId) where.clientId = clientId;

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                client: { select: { id: true, name: true, email: true, company: true } },
                items: true,
                createdBy: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        console.error("[INVOICES_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.organizationId || !session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const json = await req.json();
        const data = createInvoiceSchema.parse(json);

        // Verify client belongs to org
        const client = await prisma.client.findFirst({
            where: { id: data.clientId, organizationId: session.user.organizationId },
        });
        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 });
        }

        // Generate invoice number
        const lastInvoice = await prisma.invoice.findFirst({
            where: { organizationId: session.user.organizationId },
            orderBy: { createdAt: "desc" },
            select: { invoiceNumber: true },
        });
        const invoiceNumber = generateInvoiceNumber(lastInvoice?.invoiceNumber ?? null);

        // Calculate totals
        const items = data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
        }));
        const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = (subtotal * data.taxRate) / 100;
        const total = subtotal + taxAmount - data.discount;

        const invoice = await prisma.invoice.create({
            data: {
                organizationId: session.user.organizationId,
                clientId: data.clientId,
                createdById: session.user.id,
                invoiceNumber,
                currency: data.currency,
                subtotal,
                taxRate: data.taxRate,
                taxAmount,
                discount: data.discount,
                total,
                notes: data.notes,
                dueDate: new Date(data.dueDate),
                status: data.status,
                sentAt: data.status === "SENT" ? new Date() : null,
                items: {
                    create: items,
                },
            },
            include: { items: true, client: true },
        });

        return NextResponse.json(invoice, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error("[INVOICES_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
