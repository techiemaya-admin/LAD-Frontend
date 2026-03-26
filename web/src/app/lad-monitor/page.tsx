import { Suspense } from "react";
import LadMonitorPage from "@/components/lad-monitor/LadMonitorPage";

export const metadata = {
    title: "LAD",
    description: "Advanced Platform Health & Analytics dashboard for monitoring tenant performance, alerts, and system status.",
};

export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        }>
            <LadMonitorPage />
        </Suspense>
    );
}
