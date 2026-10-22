import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "@/pages/ReportsPage";
export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — NR Edify English Medium School" }] }),
  component: ReportsPage,
});
