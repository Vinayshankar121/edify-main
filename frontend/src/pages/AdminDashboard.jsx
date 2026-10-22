import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  IndianRupee,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import {
  useCashiers,
  useClasses,
  useFeeStructures,
  usePayments,
  useStudents,
} from "@/hooks/useSchoolData";
import { feeSummary, fullName, greeting, inr, today } from "@/lib/fees";
export function AdminDashboard() {
  const { user } = useAuth();
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: classes } = useClasses();
  const { data: structures } = useFeeStructures();
  const { data: cashiers } = useCashiers();
  const [range, setRange] = useState("daily");
  const stats = useMemo(() => {
    const summaries = students.map((s) => feeSummary(s, structures, payments));
    const collected = payments.reduce((t, p) => t + p.amount, 0);
    const pending = summaries.reduce((t, s) => t + s.balance, 0);
    const todaysTotal = payments
      .filter((p) => p.date === today())
      .reduce((t, p) => t + p.amount, 0);
    return {
      collected,
      pending,
      todaysTotal,
      activeCashiers: cashiers.filter((c) => c.status === "active").length,
    };
  }, [students, structures, payments, cashiers]);
  const trend = useMemo(() => {
    const buckets = [];
    const now = new Date();
    const steps = range === "daily" ? 7 : range === "weekly" ? 6 : 6;
    for (let i = steps - 1; i >= 0; i--) {
      const start = new Date(now);
      const end = new Date(now);
      let label = "";
      if (range === "daily") {
        start.setDate(now.getDate() - i);
        end.setDate(now.getDate() - i);
        label = start.toLocaleDateString("en-IN", { weekday: "short" });
      } else if (range === "weekly") {
        start.setDate(now.getDate() - i * 7 - 6);
        end.setDate(now.getDate() - i * 7);
        label = `W${steps - i}`;
      } else {
        start.setMonth(now.getMonth() - i, 1);
        end.setMonth(now.getMonth() - i + 1, 0);
        label = start.toLocaleDateString("en-IN", { month: "short" });
      }
      const s = start.toISOString().slice(0, 10);
      const e = end.toISOString().slice(0, 10);
      const amount = payments
        .filter((p) => p.date >= s && p.date <= e)
        .reduce((t, p) => t + p.amount, 0);
      buckets.push({ label, amount });
    }
    return buckets;
  }, [payments, range]);
  const classWise = useMemo(
    () =>
      classes.map((c) => {
        const ids = students.filter((s) => s.className === c.name).map((s) => s.id);
        return {
          name: c.name.replace("Class ", "C"),
          collected: payments
            .filter((p) => ids.includes(p.studentId))
            .reduce((t, p) => t + p.amount, 0),
        };
      }),
    [classes, students, payments],
  );
  const paidVsPending = [
    { name: "Collected", value: stats.collected, fill: "var(--color-chart-1)" },
    { name: "Pending", value: stats.pending, fill: "var(--color-chart-3)" },
  ];
  const recentPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const recentAdmissions = [...students]
    .sort((a, b) => b.admissionDate.localeCompare(a.admissionDate))
    .slice(0, 5);
  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name ?? "Admin"}`}
        subtitle="Here's what's happening at NR Edify English Medium School today."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/reports">View reports</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/admissions">New admission</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total Students" value={students.length} icon={Users} tone="primary" />
        <StatCard label="Total Classes" value={classes.length} icon={BookOpen} />
        <StatCard
          label="Today's Collection"
          value={inr(stats.todaysTotal)}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Pending Fees"
          value={inr(stats.pending)}
          icon={TrendingUp}
          tone="warning"
        />
        <StatCard
          label="Total Collection"
          value={inr(stats.collected)}
          icon={CreditCard}
          tone="success"
        />
        <StatCard label="Active Cashiers" value={stats.activeCashiers} icon={UserCheck} />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <SectionCard
          title="Fee Collection Overview"
          description="Collections across the selected period"
          className="xl:col-span-2"
          actions={
            <Tabs value={range} onValueChange={(v) => setRange(v)}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v) => `${v / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip formatter={(v) => inr(v)} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-chart-1)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Paid vs Pending" description="Share of the annual fee demand">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paidVsPending}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {paidVsPending.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => inr(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <SectionCard title="Class-wise Fee Collection" className="xl:col-span-2">
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classWise} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickFormatter={(v) => `${v / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <Tooltip formatter={(v) => inr(v)} />
                <Bar
                  dataKey="collected"
                  fill="var(--color-chart-1)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Admissions"
          actions={
            <Link
              to="/admin/students"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary"
            >
              All students <ArrowUpRight className="size-3.5" />
            </Link>
          }
        >
          <ul className="divide-y divide-border">
            {recentAdmissions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {s.firstName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fullName(s)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.className} · {s.section} · {s.admissionNo}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{s.admissionDate}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Recent Fee Payments"
        className="mt-6"
        actions={
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          >
            Payment history <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((p) => {
                const st = students.find((s) => s.id === p.studentId);
                return (
                  <TableRow key={p.id} className="animate-rise">
                    <TableCell className="font-medium">{p.receiptNo}</TableCell>
                    <TableCell>{st ? fullName(st) : "—"}</TableCell>
                    <TableCell>{st ? `${st.className} ${st.section}` : "—"}</TableCell>
                    <TableCell className="font-medium">{inr(p.amount)}</TableCell>
                    <TableCell>{p.mode}</TableCell>
                    <TableCell>{p.cashierName}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </>
  );
}
