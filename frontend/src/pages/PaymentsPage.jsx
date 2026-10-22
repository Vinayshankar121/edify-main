import { Eye, Printer, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState, PageHeader, SearchBar, SectionCard, StatusBadge } from "@/components/common";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActiveYear, useClasses, usePayments, useStudents } from "@/hooks/useSchoolData";
import { fullName, inr } from "@/lib/fees";
const ALL = "all";
export function PaymentsPage({ title = "Payment History", receiptsMode = false }) {
  const { data: payments } = usePayments();
  const { data: students } = useStudents();
  const { data: classes } = useClasses();
  const { data: year } = useActiveYear();
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [cls, setCls] = useState(ALL);
  const [cashier, setCashier] = useState(ALL);
  const [mode, setMode] = useState(ALL);
  const [receipt, setReceipt] = useState(null);
  const [limit, setLimit] = useState(20);
  const cashiers = [...new Set(payments.map((p) => p.cashierName))];
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return payments
      .filter((p) => p.academicYear === year)
      .map((p) => ({ p, s: students.find((s) => s.id === p.studentId) }))
      .filter(({ p, s }) => {
        if (date && p.date !== date) return false;
        if (cls !== ALL && s?.className !== cls) return false;
        if (cashier !== ALL && p.cashierName !== cashier) return false;
        if (mode !== ALL && p.mode !== mode) return false;
        if (!t) return true;
        return [p.receiptNo, s ? fullName(s) : "", s?.admissionNo ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(t);
      })
      .sort((a, b) => b.p.receiptNo.localeCompare(a.p.receiptNo));
  }, [payments, students, q, date, cls, cashier, mode, year]);
  const total = rows.reduce((t, r) => t + r.p.amount, 0);
  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          receiptsMode
            ? "View, print and reprint any fee receipt."
            : `${rows.length} transactions · ${inr(total)} collected`
        }
      />
      <SectionCard>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SearchBar
            value={q}
            onChange={setQ}
            placeholder="Receipt no, student, admission no"
            className="md:col-span-2"
          />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
          />
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger aria-label="Class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cashier} onValueChange={setCashier}>
            <SelectTrigger aria-label="Cashier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All cashiers</SelectItem>
              {cashiers.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger aria-label="Payment mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All modes</SelectItem>
              {["Cash", "UPI", "Card", "Bank Transfer"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments found"
            description="Adjust the filters to see more results."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Cashier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, limit).map(({ p, s }) => (
                    <TableRow key={p.id} className="animate-rise">
                      <TableCell className="font-medium">{p.receiptNo}</TableCell>
                      <TableCell>{p.date}</TableCell>
                      <TableCell>{s ? fullName(s) : "—"}</TableCell>
                      <TableCell>{s?.admissionNo ?? "—"}</TableCell>
                      <TableCell>{s ? `${s.className} ${s.section}` : "—"}</TableCell>
                      <TableCell className="text-right font-medium">{inr(p.amount)}</TableCell>
                      <TableCell>{p.mode}</TableCell>
                      <TableCell>{p.cashierName}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="View receipt"
                          onClick={() => setReceipt(p)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Reprint receipt"
                          onClick={() => setReceipt(p)}
                        >
                          <Printer className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {rows.slice(0, limit).map(({ p, s }) => (
                <button
                  key={p.id}
                  onClick={() => setReceipt(p)}
                  className="rounded-xl border border-border p-4 text-left"
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{p.receiptNo}</p>
                    <p className="font-semibold">{inr(p.amount)}</p>
                  </div>
                  <p className="mt-1 text-sm">{s ? fullName(s) : "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.date} · {p.mode} · {p.cashierName}
                  </p>
                </button>
              ))}
            </div>
            {rows.length > limit && (
              <div className="mt-4 text-center">
                <Button variant="outline" onClick={() => setLimit(limit + 20)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </SectionCard>
      <ReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
