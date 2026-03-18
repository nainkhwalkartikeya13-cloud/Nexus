import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connString = process.env.DATABASE_URL!;
console.log("DATABASE_URL exists:", !!connString);

const url = new URL(connString);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
const pool = new pg.Pool({
    host: url.hostname,
    port: Number(url.port) || 5432,
    database: url.pathname.replace(/^\//, ""),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: isLocal ? false : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new (PrismaClient as any)({ adapter });

const tasks = await prisma.task.findMany({
    take: 3,
    select: { id: true, title: true, status: true, projectId: true, assignedToId: true }
});
console.log("\n=== TASKS IN DB ===");
console.log(JSON.stringify(tasks, null, 2));

if (tasks.length > 0) {
    const task = tasks[0];
    const newStatus = task.status === "TODO" ? "IN_PROGRESS" : "TODO";
    console.log(`\nUpdating "${task.title}": ${task.status} → ${newStatus}`);

    const updated = await prisma.task.update({
        where: { id: task.id },
        data: { status: newStatus },
        select: { id: true, status: true }
    });
    console.log("✅ Updated:", updated);

    // Revert
    await prisma.task.update({ where: { id: task.id }, data: { status: task.status } });
    console.log("✅ Reverted back to:", task.status);
} else {
    console.log("No tasks found in DB!");
}

await pool.end();
