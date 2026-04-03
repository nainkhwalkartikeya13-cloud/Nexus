import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "My Profile | Nexus",
    description: "View your profile and manage your cross-project tasks.",
};

export default async function ProfilePage() {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
        redirect("/login");
    }

    // Fetch all tasks where the user is assigned
    const myTasks = await prisma.task.findMany({
        where: {
            organizationId: session.user.organizationId,
            assignedToId: session.user.id
        },
        include: {
            project: { select: { id: true, name: true, color: true } },
            assignedTo: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
    });

    const serializedTasks = myTasks.map(t => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        dueDate: t.dueDate?.toISOString() ?? null,
    }));

    const userProfile = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar,
        role: session.user.role,
    };

    return (
        <div className="p-8 pb-32 max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">
            <ProfileClient
                user={userProfile}
                initialTasks={serializedTasks as any}
            />
        </div>
    );
}
