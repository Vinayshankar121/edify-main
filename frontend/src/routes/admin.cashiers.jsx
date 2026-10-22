import { createFileRoute } from "@tanstack/react-router";
import { CashiersPage } from "@/pages/AdminConfigPages";
export const Route = createFileRoute("/admin/cashiers")({
  head: () => ({ meta: [{ title: "Cashiers — NR Edify English Medium School" }] }),
  component: CashiersPage,
});
