import { Metadata } from "next";
import { ClientsClient } from "./clients-client";

export const metadata: Metadata = {
    title: "Clients | Nexus",
    description: "Manage your client directory.",
};

export default function ClientsPage() {
    return (
        <div className="p-8 pb-32">
            <ClientsClient />
        </div>
    );
}
