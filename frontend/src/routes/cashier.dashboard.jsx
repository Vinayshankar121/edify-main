import { createFileRoute } from "@tanstack/react-router";
import { CashierDashboard } from "@/pages/CashierDashboard";
export const Route = createFileRoute("/cashier/dashboard")({
  head: () => ({
    meta: [
      { title: "Cashier Dashboard — NR Edify English Medium School" },
      { name: "description", content: "NR Edify English Medium School cashier dashboard." },
    ],
  }),
  component: CashierDashboard,
});
