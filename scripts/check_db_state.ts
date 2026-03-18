import { prisma } from "../lib/prisma.js";

async function check() {
    const orgs = await prisma.organization.findMany({ include: { members: { include: { user: true } } } });
    console.log("Orgs and members:", JSON.stringify(orgs, null, 2));

    const timeEntries = await prisma.timeEntry.findMany({
        include: {
            user: true,
            project: true,
            task: true
        }
    });

    console.log("TimeEntries:", JSON.stringify(timeEntries, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
