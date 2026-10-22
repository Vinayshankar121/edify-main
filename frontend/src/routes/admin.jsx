import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => (
    <RoleGuard role="admin">
      <Outlet />
    </RoleGuard>
  ),
});
