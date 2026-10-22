import { createFileRoute } from "@tanstack/react-router";
import { FeeStructurePage } from "@/pages/AdminConfigPages";
export const Route = createFileRoute("/admin/fee-structure")({
  head: () => ({ meta: [{ title: "Fee Structure — NR Edify English Medium School" }] }),
  component: FeeStructurePage,
});
