import { Metadata } from "next";
import { FinanceDashboard } from "./finance-dashboard";

export const metadata: Metadata = {
    title: "Revenue Dashboard | Nexus",
    description: "Track your revenue, expenses, and profit margins.",
};

export default function FinancePage() {
    return (
        <div className="p-8 pb-32">
            <FinanceDashboard />
        </div>
    );
}
