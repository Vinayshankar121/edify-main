import { createFileRoute } from "@tanstack/react-router";
import { FeeCollectionPage } from "@/pages/FeeCollectionPage";
export const Route = createFileRoute("/cashier/fee-collection")({
  head: () => ({ meta: [{ title: "Fee Collection — NR Edify English Medium School" }] }),
  component: FeeCollectionPage,
});
