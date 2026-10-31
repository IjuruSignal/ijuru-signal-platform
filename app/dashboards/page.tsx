import { LocationWorkspace } from "@/features/locations/components/location-workspace";

export const metadata = {
  title: "Dashboard & District Workspace | Ijuru Signal",
  description: "Interactive district-level weather forecasts, satellite vegetative context, historical rainfall anomalies, and human field verification across all 30 districts of Rwanda.",
};

export default function DashboardsPage() {
  return <LocationWorkspace />;
}
