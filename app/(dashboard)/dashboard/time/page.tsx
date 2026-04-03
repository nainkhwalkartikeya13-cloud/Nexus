import { Metadata } from "next";
import { TimeTrackerClient } from "./time-tracker-client";

export const metadata: Metadata = {
    title: "Time Tracker | Nexus",
    description: "Track billable hours and manage your time.",
};

export default function TimeTrackerPage() {
    return (
        <div className="p-8 pb-32">
            <TimeTrackerClient />
        </div>
    );
}
