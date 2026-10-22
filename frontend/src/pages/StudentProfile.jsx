import { Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Printer, UserX } from "lucide-react";
import { useState } from "react";
import { EmptyState, KeyValue, SectionCard, StatusBadge } from "@/components/common";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFeeStructures,
  useFeeTerms,
  usePayments,
  useSettings,
  useStudents,
} from "@/hooks/useSchoolData";
import { feeSummary, fullName, headBreakdown, inr } from "@/lib/fees";
import { printDocument } from "@/lib/print";
export function StudentProfile({ id, base }) {
  const { data: students, ready } = useStudents();
  const { data: payments } = usePayments();
  const { data: structures } = useFeeStructures();
  const { data: terms } = useFeeTerms();
  const { data: settings } = useSettings();
  const [receipt, setReceipt] = useState(null);
  const s = students.find((x) => x.id === id);
  const back = base === "/admin" ? "/admin/students" : "/cashier/students";
  if (!ready) return null;
  if (!s)
    return (
      <EmptyState
        icon={UserX}
        title="Student not found"
        action={
          <Button asChild>
            <Link to={back}>Back to students</Link>
          </Button>
        }
      />
    );
  const f = feeSummary(s, structures, payments);
  const heads = headBreakdown(s, structures, payments);
  const enrollments = students
    .filter((student) => student.studentId === s.studentId)
    .sort((left, right) => right.academicYear.localeCompare(left.academicYear));
  const enrollmentIds = new Set(enrollments.map((enrollment) => enrollment.id));
  const history = payments
    .filter((payment) => enrollmentIds.has(payment.studentId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const structureIds = s.structureIds?.length
    ? s.structureIds
    : s.structureId
      ? [s.structureId]
      : [];
  const assignedStructures = structures.filter((item) => structureIds.includes(item.id));
  const myTerms = terms.filter((term) => structureIds.includes(term.structureId));
  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" asChild>
          <Link to={back}>
            <ArrowLeft className="mr-2 size-4" /> Students
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => printDocument("profile")}>
            <Printer className="mr-2 size-4" /> Print profile
          </Button>
          {base === "/admin" && (
            <Button asChild>
              <Link to="/admin/admissions" search={{ edit: s.id }}>
                <Pencil className="mr-2 size-4" /> Edit
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div id="student-profile-print">
        <div className="profile-print-school-header mb-5 items-center gap-4 border-b-2 border-primary pb-4">
          <img
            src="/favicon.jpeg"
            alt="NR Edify English Medium School"
            width={80}
            height={64}
            className="h-16 w-20 shrink-0 object-contain"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold uppercase tracking-wide">
              {settings.schoolName}
            </h2>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {settings.location || settings.tagline || "Think Beyond"}
            </p>
            <p className="text-xs text-muted-foreground">
              {[settings.address, settings.phone, settings.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Student Profile</p>
            <p className="font-bold">{s.admissionNo}</p>
          </div>
        </div>
        <div className="surface animate-rise flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <span className="grid size-20 shrink-0 place-items-center rounded-2xl brand-gradient text-3xl font-bold text-primary-foreground">
            {s.firstName.charAt(0)}
            {s.lastName.charAt(0)}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{fullName(s)}</h1>
              <StatusBadge status={f.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {s.admissionNo} · {s.className} · Section {s.section} · {s.academicYear}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <KeyValue label="Payable" value={inr(f.payable)} />
            <KeyValue label="Paid" value={inr(f.paid)} />
            <KeyValue label="Balance" value={inr(f.balance)} />
          </div>
        </div>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="no-print flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parents">Parent Details</TabsTrigger>
            <TabsTrigger value="academic">Academic Details</TabsTrigger>
            <TabsTrigger value="fees">Fee Details</TabsTrigger>
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>
          <TabsContent forceMount value="overview">
            <SectionCard title="Student information">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <KeyValue label="Student ID" value={s.studentId} />
                <KeyValue label="Date of birth" value={s.dob} />
                <KeyValue label="Gender" value={s.gender} />
                <KeyValue label="Blood group" value={s.bloodGroup} />
                <KeyValue label="Aadhaar / ID" value={s.aadhaar} />
                <KeyValue label="Admission date" value={s.admissionDate} />
                <KeyValue label="Previous school" value={s.previousSchool} />
                <KeyValue label="Address" value={s.address} />
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="parents">
            <SectionCard title="Parents & guardian">
              <div className="grid gap-5 sm:grid-cols-3">
                <KeyValue label="Father" value={s.fatherName} />
                <KeyValue label="Father phone" value={s.fatherPhone} />
                <KeyValue label="Father email" value={s.fatherEmail} />
                <KeyValue label="Mother" value={s.motherName} />
                <KeyValue label="Mother phone" value={s.motherPhone} />
                <KeyValue label="Mother email" value={s.motherEmail} />
                <KeyValue label="Guardian" value={s.guardianName} />
                <KeyValue label="Relationship" value={s.guardianRelation} />
                <KeyValue label="Guardian phone" value={s.guardianPhone} />
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="academic">
            <SectionCard title="Academic details">
              <div className="grid gap-5 sm:grid-cols-3">
                <KeyValue label="Academic year" value={s.academicYear} />
                <KeyValue label="Class" value={s.className} />
                <KeyValue label="Section" value={s.section} />
                <KeyValue label="Roll number" value={s.rollNo} />
                <KeyValue label="Previous class" value={s.previousClass} />
                <KeyValue label="Fee category" value={s.feeCategory} />
              </div>
            </SectionCard>
          </TabsContent>
          <TabsContent value="fees">
            <div className="space-y-5">
              <SectionCard
                title={assignedStructures.map((item) => item.name).join(" + ") || "Fee structure"}
                description={`${s.academicYear} · Discount ${inr(f.discount)}`}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee head</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {heads.map((h) => (
                      <TableRow key={h.key}>
                        <TableCell>
                          {h.structureName} · {h.name}
                        </TableCell>
                        <TableCell className="text-right">{inr(h.amount)}</TableCell>
                        <TableCell className="text-right">{inr(h.paid)}</TableCell>
                        <TableCell className="text-right font-medium">{inr(h.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {myTerms.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {myTerms.map((t) => (
                      <div key={t.id} className="rounded-xl border border-border p-4">
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-lg font-semibold">{inr(t.amount)}</p>
                        <p className="text-xs text-muted-foreground">Due {t.dueDate}</p>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
              <SectionCard title="Fee history by academic year">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Academic year</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Payable</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => {
                        const summary = feeSummary(enrollment, structures, payments);
                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">{enrollment.academicYear}</TableCell>
                            <TableCell>
                              {enrollment.className} · {enrollment.section}
                            </TableCell>
                            <TableCell className="text-right">{inr(summary.payable)}</TableCell>
                            <TableCell className="text-right">{inr(summary.paid)}</TableCell>
                            <TableCell className="text-right">{inr(summary.balance)}</TableCell>
                            <TableCell>
                              <StatusBadge status={summary.status} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </SectionCard>
            </div>
          </TabsContent>
          <TabsContent value="history">
            <SectionCard title="Payments">
              {history.length === 0 ? (
                <EmptyState icon={UserX} title="No payments yet" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Academic year</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Cashier</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.receiptNo}</TableCell>
                          <TableCell>{p.academicYear}</TableCell>
                          <TableCell>{p.date}</TableCell>
                          <TableCell>{inr(p.amount)}</TableCell>
                          <TableCell>{p.mode}</TableCell>
                          <TableCell>{p.cashierName}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setReceipt(p)}>
                              Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
      <ReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
