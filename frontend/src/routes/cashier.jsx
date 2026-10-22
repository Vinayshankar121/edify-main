import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
export const Route = createFileRoute("/cashier")({
  ssr: false,
  component: () => (
    <RoleGuard role="cashier">
      <Outlet />
    </RoleGuard>
  ),
});
