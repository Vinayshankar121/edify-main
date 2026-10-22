import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarRange,
  CreditCard,
  FileBarChart2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { COLLECTIONS, useCollection } from "@/lib/store";
import { cn } from "@/lib/utils";
const adminNav = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/admissions", label: "Admissions", icon: UserPlus },
  { to: "/admin/students", label: "Students", icon: GraduationCap },
  { to: "/admin/classes", label: "Classes & Sections", icon: Users },
  { to: "/admin/fee-structure", label: "Fee Structure", icon: Wallet },
  { to: "/admin/fee-terms", label: "Fee Terms", icon: CalendarRange },
  { to: "/admin/fee-collection", label: "Fee Collection", icon: CreditCard },
  { to: "/admin/payments", label: "Payment History", icon: Receipt },
  { to: "/admin/receipts", label: "Receipts", icon: Receipt },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/admin/academic-years", label: "Academic Years", icon: CalendarRange },
  { to: "/admin/cashiers", label: "Cashiers", icon: Users },
  { to: "/admin/settings", label: "School Settings", icon: Settings },
];
const cashierNav = [
  { to: "/cashier/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cashier/students", label: "Students", icon: GraduationCap },
  { to: "/cashier/fee-collection", label: "Fee Collection", icon: CreditCard },
  { to: "/cashier/payments", label: "Payment History", icon: Receipt },
  { to: "/cashier/receipts", label: "Receipts", icon: Receipt },
  { to: "/cashier/reports", label: "Reports", icon: FileBarChart2 },
];
export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { data: years } = useCollection(COLLECTIONS.academicYears, []);
  const { data: activeYear, setData: setActiveYear } = useCollection(
    COLLECTIONS.activeYear,
    "2025-2026",
  );
  const { data: settings } = useCollection(COLLECTIONS.settings, null);
  const nav = user?.role === "admin" ? adminNav : cashierNav;
  const current = nav.find((n) => pathname.startsWith(n.to));
  useEffect(() => setDrawer(false), [pathname]);
  const onLogout = () => {
    logout();
    navigate({ to: "/", replace: true });
  };
  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-5">
        <img
          src="/favicon.jpeg"
          alt="NR Edify English Medium School"
          width={64}
          height={50}
          className="h-10 w-16 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold uppercase tracking-wide">
              {settings?.schoolName ?? "NR Edify English Medium School"}
            </p>
            <p className="truncate text-[11px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
              {settings?.tagline ?? "Think Beyond"}
            </p>
          </div>
        )}
        <button
          onClick={() => setDrawer(false)}
          className="ml-auto rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
          aria-label="Close navigation"
        >
          <X className="size-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-6">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
              title={item.label}
            >
              <item.icon className="size-4.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      {!collapsed && (
        <p className="px-4 pb-4 text-[11px] leading-relaxed text-sidebar-foreground/45">
          Demo build — data is stored in this browser only.
        </p>
      )}
    </div>
  );
  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "no-print hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {drawer && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 animate-in fade-in"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[268px] shadow-2xl animate-in slide-in-from-left duration-300">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.innerWidth < 1024 ? setDrawer(true) : setCollapsed((c) => !c))}
              aria-label="Toggle navigation"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">
                {current?.label ?? "Dashboard"}
              </p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                {settings?.schoolName ?? "NR Edify English Medium School"} ·{" "}
                {settings?.location ?? "Thikkonda"}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden xl:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students, receipts…"
                  aria-label="Global search"
                  className="w-56 pl-9"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const q = e.target.value;
                      navigate({
                        to: user?.role === "admin" ? "/admin/students" : "/cashier/students",
                        search: { q },
                      });
                    }
                  }}
                />
              </div>

              <Select
                value={activeYear}
                onValueChange={setActiveYear}
                disabled={user?.role !== "admin"}
              >
                <SelectTrigger className="hidden w-[140px] sm:flex" aria-label="Academic year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.name}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-5" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 transition-colors hover:bg-accent">
                    <span className="grid size-8 place-items-center rounded-full brand-gradient text-sm font-semibold text-primary-foreground">
                      {user?.name?.charAt(0) ?? "U"}
                    </span>
                    <span className="hidden text-left sm:block">
                      <span className="block text-xs font-semibold leading-4">{user?.name}</span>
                      <span className="block text-[11px] leading-3 text-muted-foreground">
                        {user?.role === "admin" ? "Super Admin" : "Cashier"}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex items-center justify-between gap-2">
                    <span className="truncate">{user?.name}</span>
                    <Badge
                      variant="outline"
                      className="border-primary/30 bg-accent text-accent-foreground"
                    >
                      {user?.role === "admin" ? "Super Admin" : "Cashier"}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-destructive">
                    <LogOut className="mr-2 size-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
