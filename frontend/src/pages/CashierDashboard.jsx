import { Link } from "@tanstack/react-router";
import {
  CreditCard,
  IndianRupee,
  Printer,
  Receipt,
  Search,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { EmptyState, PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useFeeStructures, usePayments, useStudents } from "@/hooks/useSchoolData";
import { feeSummary, fullName, greeting, inr, today } from "@/lib/fees";
export function CashierDashboard() {
  const { user } = useAuth();
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: structures } = useFeeStructures();
  const mine = useMemo(
    () => payments.filter((p) => p.date === today() && p.cashierName === user?.name),
    [payments, user],
  );
  const todays = useMemo(() => payments.filter((p) => p.date === today()), [payments]);
  const pending = useMemo(
    () => students.reduce((t, s) => t + feeSummary(s, structures, payments).balance, 0),
    [students, structures, payments],
  );
  const total = mine.reduce((t, p) => t + p.amount, 0);
  const quickActions = [
    { to: "/cashier/fee-collection", label: "Collect Fee", icon: CreditCard },
    { to: "/cashier/students", label: "Search Student", icon: Search },
    { to: "/cashier/receipts", label: "Print Receipt", icon: Printer },
    { to: "/cashier/payments", label: "Payment History", icon: Receipt },
  ];
  return (
    <>
      <PageHeader
        title={`${greeting()}, ${user?.name ?? "Cashier"}`}
        subtitle="Front desk fee counter — NR Edify English Medium School, Thikkonda."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today's Collection" value={inr(total)} icon={IndianRupee} tone="success" />
        <StatCard
          label="Today's Transactions"
          value={mine.length}
          icon={CreditCard}
          tone="primary"
        />
        <StatCard label="Receipts Generated" value={mine.length} icon={Receipt} />
        <StatCard
          label="Pending Collections"
          value={inr(pending)}
          icon={TrendingDown}
          tone="warning"
        />
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="surface animate-rise brand-gradient relative overflow-hidden p-7 text-primary-foreground xl:col-span-2">
          <Wallet className="absolute -right-6 -top-6 size-40 opacity-15" />
          <p className="text-sm font-medium opacity-90">Primary action</p>
          <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Collect Fee</h2>
          <p className="mt-2 max-w-md text-sm opacity-90">
            Search a student by admission number, name or phone, review the outstanding balance and
            issue a printed receipt instantly.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to="/cashier/fee-collection">Start collection</Link>
          </Button>
        </div>

        <SectionCard title="Quick actions">
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex flex-col gap-2 rounded-xl border border-border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent"
              >
                <a.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{a.label}</span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Today's Transactions" description="All counters" className="mt-6">
        {todays.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No collections yet today"
            description="Payments you collect will appear here with their receipt numbers."
            action={
              <Button asChild>
                <Link to="/cashier/fee-collection">Collect fee</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todays.map((p) => {
                  const st = students.find((s) => s.id === p.studentId);
                  return (
                    <TableRow key={p.id} className="animate-rise">
                      <TableCell className="font-medium">{p.receiptNo}</TableCell>
                      <TableCell>{st ? fullName(st) : "—"}</TableCell>
                      <TableCell>{st?.admissionNo ?? "—"}</TableCell>
                      <TableCell>{st ? `${st.className} ${st.section}` : "—"}</TableCell>
                      <TableCell className="font-medium">{inr(p.amount)}</TableCell>
                      <TableCell>{p.mode}</TableCell>
                      <TableCell>{p.cashierName}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
