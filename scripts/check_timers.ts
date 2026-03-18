import { prisma } from "../lib/prisma.js";

async function check() {
    console.log("--- RUNNING TIMERS ---");
    const running = await prisma.timeEntry.findMany({
        where: { endTime: null },
        include: { user: true, project: true, organization: true }
    });
    console.log(JSON.stringify(running, null, 2));

    console.log("--- ALL ORGS AND MEMBERS ---");
    const orgs = await prisma.organization.findMany({
        include: { members: { include: { user: true } } }
    });
    console.log(JSON.stringify(orgs, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
