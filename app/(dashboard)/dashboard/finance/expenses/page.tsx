import { Metadata } from "next";
import { ExpensesClient } from "./expenses-client";

export const metadata: Metadata = {
    title: "Expenses | Nexus",
    description: "Track and manage your business expenses.",
};

export default function ExpensesPage() {
    return (
        <div className="p-8 pb-32">
            <ExpensesClient />
        </div>
    );
}
