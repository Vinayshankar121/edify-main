import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages/AdminDashboard";
export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — NR Edify English Medium School" },
      { name: "description", content: "NR Edify English Medium School admin dashboard." },
    ],
  }),
  component: AdminDashboard,
});
