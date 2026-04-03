import { Metadata } from "next";
import { InvoicesClient } from "./invoices-client";

export const metadata: Metadata = {
    title: "Invoices | Nexus",
    description: "Create, manage, and track your invoices.",
};

export default function InvoicesPage() {
    return (
        <div className="p-8 pb-32">
            <InvoicesClient />
        </div>
    );
}
