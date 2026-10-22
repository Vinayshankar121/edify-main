import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, GraduationCap, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/common";
import { useAuth } from "@/context/AuthContext";
export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — NR Edify English Medium School Management System" },
      {
        name: "description",
        content:
          "Secure sign in for NR Edify English Medium School Thikkonda administrators and fee cashiers.",
      },
      {
        property: "og:title",
        content: "Sign in — NR Edify English Medium School Management System",
      },
      {
        property: "og:description",
        content:
          "Sign in to manage admissions, fee collection and receipts at NR Edify English Medium School.",
      },
    ],
  }),
  component: LoginPage,
});
function LoginPage() {
  const { login, user, ready } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState();
  useEffect(() => {
    if (ready && user) {
      navigate({
        to: user.role === "admin" ? "/admin/dashboard" : "/cashier/dashboard",
        replace: true,
      });
    }
  }, [ready, user, navigate]);
  const submit = async (e) => {
    e.preventDefault();
    setError(undefined);
    if (!username || !password) {
      setError("Enter both username and password.");
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.ok || !result.user) {
      setError(result.error);
      return;
    }
    toast.success(`Welcome back, ${result.user.name}`);
    navigate({
      to: result.user.role === "admin" ? "/admin/dashboard" : "/cashier/dashboard",
      replace: true,
    });
  };
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="absolute -right-24 top-16 size-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -left-16 bottom-0 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img
            src="/favicon.jpeg"
            alt="NR Edify English Medium School"
            width={72}
            height={56}
            className="h-14 w-[4.5rem] object-contain"
          />
          <div>
            <p className="text-lg font-semibold uppercase tracking-wide">
              NR Edify English Medium School
            </p>
            <p className="text-xs uppercase tracking-[0.3em] text-sidebar-foreground/60">
              Think Beyond
            </p>
          </div>
        </div>
        <div className="relative max-w-md space-y-5">
          <h1 className="text-4xl font-semibold leading-tight">
            School administration, <span className="text-primary">simplified.</span>
          </h1>
          <p className="text-sm leading-relaxed text-sidebar-foreground/70">
            Admissions, class management, fee structures, collections, receipts and reports — one
            calm workspace for the NR Edify English Medium School front office at Thikkonda.
          </p>
          <ul className="space-y-3 text-sm text-sidebar-foreground/80">
            {[
              "Multi-step student admission with parent records",
              "Fee structures, terms and instant receipt printing",
              "Separate workspaces for Super Admin and Cashiers",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/45">
          © {new Date().getFullYear()} NR Edify English Medium School, Thikkonda. All rights
          reserved.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="animate-rise w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
            src="/favicon.jpeg"
              alt="NR Edify English Medium School"
              width={64}
              height={50}
              className="h-12 w-16 object-contain"
            />
            <div>
              <p className="font-semibold uppercase tracking-wide">
                NR Edify English Medium School
              </p>
              <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Think Beyond
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            <GraduationCap className="size-3.5" /> School Management System
          </span>
          <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Sign in to your workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use the credentials issued by the school administrator.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field label="Username" required>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  className="pl-9"
                />
              </div>
            </Field>

            <Field label="Password" required error={error}>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="px-9"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reset your password</DialogTitle>
                    <DialogDescription>
                      Password resets are handled by the school Super Admin. Contact the front
                      office and a new password will be issued to you.
                    </DialogDescription>
                  </DialogHeader>
                  <Input placeholder="Registered email" aria-label="Registered email" />
                  <DialogFooter>
                    <Button
                      onClick={() =>
                        toast.success("Reset request sent to the school administrator.")
                      }
                    >
                      Send request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 rounded-xl border border-dashed border-border p-4 text-xs leading-relaxed text-muted-foreground">
            Sign in with the username and password issued by the school administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
