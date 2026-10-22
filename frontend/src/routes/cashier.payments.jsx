import { createFileRoute } from "@tanstack/react-router";
import { PaymentsPage } from "@/pages/PaymentsPage";
export const Route = createFileRoute("/cashier/payments")({
  head: () => ({ meta: [{ title: "Payment History — NR Edify English Medium School" }] }),
  component: () => <PaymentsPage />,
});
