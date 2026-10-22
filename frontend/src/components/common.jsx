import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="animate-rise mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function SectionCard({ title, description, actions, className, children }) {
  return (
    <section className={cn("surface animate-rise p-5 sm:p-6", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
export function StatCard({ label, value, icon: Icon, hint, tone = "default" }) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    primary: "bg-accent text-accent-foreground",
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning-foreground",
  };
  return (
    <div className="surface animate-rise group p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-105",
            tones[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
export function StatusBadge({ status }) {
  const map = {
    Paid: "border-success/30 bg-success/12 text-success",
    Success: "border-success/30 bg-success/12 text-success",
    active: "border-success/30 bg-success/12 text-success",
    Partial: "border-warning/40 bg-warning/20 text-warning-foreground",
    Pending: "border-destructive/30 bg-destructive/10 text-destructive",
    inactive: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", map[status] ?? "bg-muted text-muted-foreground")}
    >
      {status}
    </Badge>
  );
}
export function SearchBar({ value, onChange, placeholder = "Search…", className }) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  );
}
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="animate-rise flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function LoadingRows({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
export function Field({ label, required, error, children, className }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
export function KeyValue({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
