import { prisma } from './lib/prisma';

async function main() {
    const task = await prisma.task.findFirst();
    if (!task) {
        console.log("No task found to test.");
        return;
    }

    console.log("Found task:", task.id, "Status:", task.status, "Position:", task.position);

    const status = "IN_PROGRESS";
    const position = 0;
    const existingTask = task;

    console.log("Simulating move to", status, "at position", position);

    const destTasks = await prisma.task.findMany({
        where: { projectId: existingTask.projectId, status },
        orderBy: { position: "asc" },
    });

    const filtered = destTasks.filter(t => t.id !== task.id);
    filtered.splice(position, 0, existingTask as any);

    for (let i = 0; i < filtered.length; i++) {
        console.log(`Will update ${filtered[i].id} to position ${i} and status ${filtered[i].id === task.id ? status : filtered[i].status}`);
    }

    const result = await prisma.$transaction(
        filtered.map((t, index) =>
            prisma.task.update({
                where: { id: t.id },
                data: { position: index, ...(t.id === task.id && { status }) }
            })
        )
    );

    console.log("Transaction complete:", result.map(t => ({ id: t.id, status: t.status, pos: t.position })));

    const verify = await prisma.task.findUnique({ where: { id: task.id } });
    console.log("Verify:", verify?.status, verify?.position);
}

main().catch(console.error).finally(() => prisma.$disconnect());
