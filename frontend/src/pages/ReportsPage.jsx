import { Download, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatCard, StatusBadge } from "@/components/common";
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
import {
  useActiveYear,
  useClasses,
  useFeeStructures,
  usePayments,
  useStudents,
} from "@/hooks/useSchoolData";
import { feeSummary, fullName, inr } from "@/lib/fees";
import { printDocument } from "@/lib/print";
import { downloadReportWorkbook } from "@/lib/reportExport";
import { CreditCard, IndianRupee, TrendingDown, Users } from "lucide-react";
const ALL = "all";
const REPORTS = [
  "Daily Collection",
  "Monthly Collection",
  "Class-wise Collection",
  "Cashier-wise Collection",
  "Student Fee History",
  "Pending Fee",
  "Paid Fee",
  "Balance Fee",
];
export function ReportsPage() {
  const { data: payments } = usePayments();
  const { data: students } = useStudents();
  const { data: structures } = useFeeStructures();
  const { data: classes } = useClasses();
  const { data: year } = useActiveYear();
  const [report, setReport] = useState("Daily Collection");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cls, setCls] = useState(ALL);
  const [sec, setSec] = useState(ALL);
  const [cashier, setCashier] = useState(ALL);
  const [mode, setMode] = useState(ALL);
  const yearStudents = students
    .filter((s) => s.academicYear === year)
    .filter((s) => (cls === ALL || s.className === cls) && (sec === ALL || s.section === sec));
  const ids = new Set(yearStudents.map((s) => s.id));
  const filteredPayments = payments.filter(
    (p) =>
      p.academicYear === year &&
      ids.has(p.studentId) &&
      (!from || p.date >= from) &&
      (!to || p.date <= to) &&
      (cashier === ALL || p.cashierName === cashier) &&
      (mode === ALL || p.mode === mode),
  );
  const summaries = yearStudents.map((s) => ({
    s,
    f: feeSummary(
      s,
      structures,
      payments.filter((p) => p.academicYear === year),
    ),
  }));
  const collected = filteredPayments.reduce((t, p) => t + p.amount, 0);
  const pending = summaries.reduce((t, x) => t + x.f.balance, 0);
  const sections = classes.find((c) => c.name === cls)?.sections ?? [];
  const { columns, rows } = useMemo(() => {
    const group = (key, label) => {
      const m = new Map();
      filteredPayments.forEach((p) => {
        const k = key(p);
        const v = m.get(k) ?? { count: 0, amount: 0 };
        m.set(k, { count: v.count + 1, amount: v.amount + p.amount });
      });
      return {
        columns: [label, "Transactions", "Amount"],
        rows: [...m.entries()]
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([k, v]) => ({ [label]: k, Transactions: v.count, Amount: inr(v.amount) })),
      };
    };
    const byId = (id) => students.find((s) => s.id === id);
    switch (report) {
      case "Daily Collection":
        return group((p) => p.date, "Date");
      case "Monthly Collection":
        return group((p) => p.date.slice(0, 7), "Month");
      case "Class-wise Collection":
        return group((p) => byId(p.studentId)?.className ?? "—", "Class");
      case "Cashier-wise Collection":
        return group((p) => p.cashierName, "Cashier");
      case "Student Fee History":
        return {
          columns: ["Receipt", "Date", "Student", "Class", "Amount", "Mode", "Cashier"],
          rows: filteredPayments.map((p) => {
            const s = byId(p.studentId);
            return {
              Receipt: p.receiptNo,
              Date: p.date,
              Student: s ? fullName(s) : "—",
              Class: s ? `${s.className} ${s.section}` : "—",
              Amount: inr(p.amount),
              Mode: p.mode,
              Cashier: p.cashierName,
            };
          }),
        };
      default: {
        const list = summaries.filter(({ f }) =>
          report === "Pending Fee"
            ? f.status !== "Paid"
            : report === "Paid Fee"
              ? f.status === "Paid"
              : report === "Balance Fee"
                ? f.balance > 0
                : true,
        );
        return {
          columns: ["Admission No", "Student", "Class", "Payable", "Paid", "Balance", "Status"],
          rows: list.map(({ s, f }) => ({
            "Admission No": s.admissionNo,
            Student: fullName(s),
            Class: `${s.className} ${s.section}`,
            Payable: inr(f.payable),
            Paid: inr(f.paid),
            Balance: inr(f.balance),
            Status: f.status,
          })),
        };
      }
    }
  }, [report, filteredPayments, summaries, students]);

  const feeReportRows = summaries.filter(({ f }) =>
    report === "Pending Fee"
      ? f.status !== "Paid"
      : report === "Paid Fee"
        ? f.status === "Paid"
        : report === "Balance Fee"
          ? f.balance > 0
          : true,
  );
  const feeDetailColumns = [
    "Admission No",
    "Student ID",
    "Student",
    "Academic Year",
    "Class",
    "Section",
    "Roll No",
    "Fee Structure",
    "Fee Total",
    "Discount",
    "Payable",
    "Paid",
    "Balance",
    "Status",
  ];
  const feeDetails = feeReportRows.map(({ s, f }) => ({
    "Admission No": s.admissionNo,
    "Student ID": s.studentId,
    Student: fullName(s),
    "Academic Year": s.academicYear,
    Class: s.className,
    Section: s.section,
    "Roll No": s.rollNo,
    "Fee Structure": structures
      .filter((item) =>
        (s.structureIds?.length ? s.structureIds : [s.structureId]).includes(item.id),
      )
      .map((item) => item.name)
      .join(", "),
    "Fee Total": f.total,
    Discount: f.discount,
    Payable: f.payable,
    Paid: f.paid,
    Balance: f.balance,
    Status: f.status,
  }));
  const paymentDetailColumns = [
    "Receipt",
    "Date",
    "Academic Year",
    "Admission No",
    "Student ID",
    "Student",
    "Class",
    "Section",
    "Amount",
    "Mode",
    "Reference",
    "Remarks",
    "Cashier",
    "Status",
  ];
  const paymentDetails = filteredPayments.map((payment) => {
    const student = students.find((item) => item.id === payment.studentId);
    return {
      Receipt: payment.receiptNo,
      Date: payment.date,
      "Academic Year": payment.academicYear,
      "Admission No": payment.admissionNo ?? student?.admissionNo ?? "",
      "Student ID": student?.studentId ?? "",
      Student: payment.studentName || (student ? fullName(student) : ""),
      Class: student?.className ?? "",
      Section: student?.section ?? "",
      Amount: payment.amount,
      Mode: payment.mode,
      Reference: payment.reference,
      Remarks: payment.remarks,
      Cashier: payment.cashierName,
      Status: payment.status,
    };
  });
  const isFeeReport = ["Pending Fee", "Paid Fee", "Balance Fee"].includes(report);
  const detailColumns = isFeeReport ? feeDetailColumns : paymentDetailColumns;
  const details = isFeeReport ? feeDetails : paymentDetails;
  const exportReport = async () => {
    try {
      await downloadReportWorkbook({
        report,
        academicYear: year,
        columns,
        rows,
        detailColumns,
        details,
        filters: {
          From: from || "All",
          To: to || "All",
          Class: cls === ALL ? "All classes" : cls,
          Section: sec === ALL ? "All sections" : sec,
          Cashier: cashier === ALL ? "All cashiers" : cashier,
          "Payment mode": mode === ALL ? "All modes" : mode,
        },
        totals: {
          transactions: filteredPayments.length,
          students: yearStudents.length,
          collected,
          pending,
        },
      });
      toast.success("Detailed report downloaded.");
    } catch (error) {
      toast.error(error.message || "Could not download the report.");
    }
  };
  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={`Academic year ${year}`}
        actions={
          <>
            <Button variant="outline" onClick={() => printDocument("report")}>
              <Printer className="mr-2 size-4" /> Print report
            </Button>
            <Button onClick={() => void exportReport()}>
              <Download className="mr-2 size-4" /> Download Excel
            </Button>
          </>
        }
      />
      <div className="no-print mb-5 flex gap-2 overflow-x-auto pb-1">
        {REPORTS.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={r === report ? "default" : "outline"}
            onClick={() => setReport(r)}
            className="shrink-0"
          >
            {r}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total transactions"
          value={filteredPayments.length}
          icon={CreditCard}
          tone="primary"
        />
        <StatCard
          label="Total collected"
          value={inr(collected)}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard label="Pending amount" value={inr(pending)} icon={TrendingDown} tone="warning" />
        <StatCard label="Number of students" value={yearStudents.length} icon={Users} />
      </div>
      <SectionCard title={`${report} Report`} className="mt-6">
        <div className="no-print mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
          />
          <Select
            value={cls}
            onValueChange={(v) => {
              setCls(v);
              setSec(ALL);
            }}
          >
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
          <Select value={sec} onValueChange={setSec}>
            <SelectTrigger aria-label="Section">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s} value={s}>
                  Section {s}
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
              {[...new Set(payments.map((p) => p.cashierName))].map((c) => (
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
        <div id="print-report" className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No records for these filters.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c}>
                      {c === "Status" ? <StatusBadge status={String(r[c])} /> : r[c]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </>
  );
}
