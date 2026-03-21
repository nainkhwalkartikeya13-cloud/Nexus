import { OrgMemberRole, TaskStatus, TaskPriority, SubscriptionPlan, ExpenseCategory, InvoiceStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Seeding database...");

  // Cleanup existing data
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.documentCollaborator.deleteMany();
  await prisma.document.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const hashedPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Jordan Lee (Admin)",
      email: "admin@acme.com",
      password: hashedPassword,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: "Sarah Kim (User)",
      email: "user@acme.com",
      password: hashedPassword,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: "Marcus Webb",
      email: "marcus@acme.com",
      password: hashedPassword,
    },
  });

  // 2. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp",
      plan: SubscriptionPlan.PRO,
      members: {
        create: [
          { userId: admin.id, role: OrgMemberRole.OWNER, hourlyRate: 150 },
          { userId: user.id, role: OrgMemberRole.MEMBER, hourlyRate: 100 },
          { userId: marcus.id, role: OrgMemberRole.ADMIN, hourlyRate: 120 },
        ],
      },
    },
    include: {
      members: true,
    },
  });

  // 3. Create Projects
  const projectsData = [
    { name: "Nexus v2.0 Launch", emoji: "🚀", color: "#6366f1", description: "Q3 roadmap for the new client dashboard overhaul." },
    { name: "Stripe Billing Integration", emoji: "🎨", color: "#10b981", description: "Implement subscription models and webhook listeners." },
    { name: "Mobile App MVP", emoji: "📱", color: "#f97316", description: "React Native conversion for the employee portal." },
  ];

  const projects = [];
  for (const p of projectsData) {
    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        description: p.description,
        createdById: admin.id,
        members: {
          create: [
            { userId: admin.id },
            { userId: user.id },
            { userId: marcus.id },
          ],
        },
      },
    });
    projects.push(project);
  }

  // 4. Create Clients & Invoices
  const client1 = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: "Global Tech Solutions",
      email: "billing@globaltech.com",
      company: "Global Tech Inc.",
      currency: "USD",
    }
  });

  const client2 = await prisma.client.create({
    data: {
      organizationId: org.id,
      name: "StartupX",
      email: "founders@startupx.co",
      company: "StartupX LLC",
      currency: "USD",
    }
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: client1.id,
      createdById: admin.id,
      invoiceNumber: "INV-2026-001",
      status: InvoiceStatus.PAID,
      currency: "USD",
      subtotal: 4500,
      taxRate: 10,
      taxAmount: 450,
      total: 4950,
      dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Paid 7 days ago
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: invoice1.id, description: "Frontend Development (40 hours)", quantity: 40, rate: 100, amount: 4000 },
      { invoiceId: invoice1.id, description: "UX Audit", quantity: 1, rate: 500, amount: 500 },
    ]
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      clientId: client2.id,
      createdById: admin.id,
      invoiceNumber: "INV-2026-002",
      status: InvoiceStatus.DRAFT,
      currency: "USD",
      subtotal: 8900,
      taxRate: 10,
      taxAmount: 890,
      total: 9790,
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }
  });

  await prisma.invoiceItem.createMany({
    data: [
      { invoiceId: invoice2.id, description: "Mobile App MVP - React Native", quantity: 1, rate: 8900, amount: 8900 },
    ]
  });

  // 5. Create Tasks for Nexus v2.0
  const p1 = projects[0];
  await prisma.task.create({ data: { organizationId: org.id, projectId: p1.id, title: "Audit existing React components", status: TaskStatus.DONE, priority: TaskPriority.HIGH, createdById: admin.id, assignedToId: user.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p1.id, title: "Finalize color palette", status: TaskStatus.DONE, priority: TaskPriority.MEDIUM, createdById: admin.id, assignedToId: marcus.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p1.id, title: "Migrate legacy Redux to Zustand", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, createdById: admin.id, assignedToId: user.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p1.id, title: "Redesign dashboard layout", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, createdById: admin.id, assignedToId: admin.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p1.id, title: "Write E2E tests", status: TaskStatus.TODO, priority: TaskPriority.LOW, createdById: admin.id, assignedToId: user.id } });

  // 6. Create Tasks for Stripe Billing
  let p2 = projects[1];
  await prisma.task.create({ data: { organizationId: org.id, projectId: p2.id, title: "Create Stripe sandbox accounts", status: TaskStatus.DONE, priority: TaskPriority.LOW, createdById: admin.id, assignedToId: admin.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p2.id, title: "Map database schema", status: TaskStatus.DONE, priority: TaskPriority.HIGH, createdById: admin.id, assignedToId: user.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p2.id, title: "Implement webhook listener", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, createdById: admin.id, assignedToId: admin.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p2.id, title: "Build pricing tier UI", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, createdById: admin.id, assignedToId: user.id } });
  await prisma.task.create({ data: { organizationId: org.id, projectId: p2.id, title: "Edge cases for failed payments", status: TaskStatus.TODO, priority: TaskPriority.HIGH, createdById: admin.id, assignedToId: marcus.id } });

  // 7. Create Document
  await prisma.document.create({
    data: {
      organizationId: org.id,
      projectId: p2.id,
      title: "Stripe Webhook Event Mapping",
      emoji: "💳",
      createdById: admin.id,
      content: {
        "type": "doc",
        "content": [
          {
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [{ "type": "text", "text": "Overview" }]
          },
          {
            "type": "paragraph",
            "content": [{ "type": "text", "text": "We need to ensure every event is idempotently processed." }]
          },
          {
            "type": "bulletList",
            "content": [
              {
                "type": "listItem",
                "content": [
                  { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "customer.subscription.created" }, { "type": "text", "text": " → Update user role to PRO" }] }
                ]
              },
              {
                "type": "listItem",
                "content": [
                  { "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "invoice.payment_failed" }, { "type": "text", "text": " → Trigger the dunning email sequence" }] }
                ]
              }
            ]
          }
        ]
      }
    }
  });

  // 8. Time Entries (for analytics)
  const now = new Date();
  await prisma.timeEntry.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      projectId: p1.id,
      startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
      endTime: now,
      duration: 4 * 3600,
      description: "Working on dashboard layout",
      billable: true,
      hourlyRate: 150,
    }
  });

  await prisma.timeEntry.create({
    data: {
      organizationId: org.id,
      userId: user.id,
      projectId: p2.id,
      startTime: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
      endTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 4 hours long
      duration: 4 * 3600,
      description: "Stripe integration",
      billable: true,
      hourlyRate: 100,
    }
  });

  console.log("=============================");
  console.log("Database seeded successfully!");
  console.log("=============================");
  console.log("🔑 ADMIN LOGIN:");
  console.log("Email: admin@acme.com");
  console.log("Password: password123");
  console.log("-----------------------------");
  console.log("🔑 USER LOGIN:");
  console.log("Email: user@acme.com");
  console.log("Password: password123");
  console.log("=============================");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
