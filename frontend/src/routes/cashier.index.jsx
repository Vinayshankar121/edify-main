import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/cashier/")({
  beforeLoad: () => {
    throw redirect({ to: "/cashier/dashboard" });
  },
});
