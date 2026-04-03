import { Metadata } from "next";
import { GoalsClient } from "./goals-client";

export const metadata: Metadata = {
    title: "Goals | Nexus",
    description: "Set and track your income goals.",
};

export default function GoalsPage() {
    return (
        <div className="p-8 pb-32">
            <GoalsClient />
        </div>
    );
}
