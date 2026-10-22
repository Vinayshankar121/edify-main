import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
export function RoleGuard({ role, children }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !user) navigate({ to: "/", replace: true });
  }, [ready, user, navigate]);
  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  if (user.role !== role) {
    return (
      <AppShell>
        <div className="animate-rise mx-auto max-w-lg surface mt-10 p-10 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="mt-5 text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have permission to open this section. You can continue from your
            own dashboard.
          </p>
          <Button asChild className="mt-6">
            <Link to={user.role === "admin" ? "/admin/dashboard" : "/cashier/dashboard"}>
              Go to my dashboard
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }
  return <AppShell>{children}</AppShell>;
}
