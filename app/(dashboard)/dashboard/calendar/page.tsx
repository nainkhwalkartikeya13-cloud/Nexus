import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarClient } from "./calendar-client";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
    const session = await auth();
    if (!session?.user?.organizationId) {
        redirect("/login");
    }

    const projects = await prisma.project.findMany({
        where: { organizationId: session.user.organizationId },
        select: { id: true, name: true, emoji: true },
    });

    return (
        <div className="h-[calc(100vh-4rem)] bg-bg-base flex flex-col">
            <CalendarClient projects={projects} />
        </div>
    );
}
