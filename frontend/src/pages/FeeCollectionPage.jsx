import { CreditCard, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  EmptyState,
  Field,
  KeyValue,
  PageHeader,
  SearchBar,
  SectionCard,
  StatusBadge,
} from "@/components/common";
import { ReceiptDialog } from "@/components/ReceiptDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { apiRequest } from "@/lib/api";
import { COLLECTIONS, refreshCollection } from "@/lib/store";
import { useActiveYear, useFeeStructures, usePayments, useStudents } from "@/hooks/useSchoolData";
import { feeSummary, fullName, headBreakdown, inr, today } from "@/lib/fees";
import { cn } from "@/lib/utils";
export function FeeCollectionPage() {
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: structures } = useFeeStructures();
  const { data: year } = useActiveYear();
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState(null);
  const [selectedHeads, setSelectedHeads] = useState([]);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(today());
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return students
      .filter((s) => s.academicYear === year)
      .filter((s) =>
        [fullName(s), s.admissionNo, s.fatherPhone, s.motherPhone, s.guardianPhone]
          .join(" ")
          .toLowerCase()
          .includes(t),
      )
      .slice(0, 8);
  }, [q, students, year]);
  const st = students.find((s) => s.id === selId);
  const f = st ? feeSummary(st, structures, payments) : null;
  const heads = st ? headBreakdown(st, structures, payments) : [];
  const selectedHeadRows = heads.filter((head) => selectedHeads.includes(head.key));
  const selectedHeadBalance = selectedHeadRows.reduce((total, head) => total + head.balance, 0);
  const collect = async () => {
    if (!st || !f) return;
    if (!selectedHeadRows.length) return setError("Select at least one fee head to collect.");
    const amt = Number(amount);
    if (!amt || amt <= 0) return setError("Enter a valid amount.");
    if (amt > selectedHeadBalance)
      return setError(`Amount cannot exceed selected fee balance of ${inr(selectedHeadBalance)}.`);
    if (amt > f.balance)
      return setError(`Amount cannot exceed outstanding balance of ${inr(f.balance)}.`);
    if (mode !== "Cash" && !reference.trim())
      return setError("Reference / transaction number is required for non-cash payments.");
    try {
      const p = await apiRequest("/payments", {
        method: "POST",
        body: {
          studentId: st.id,
          date,
          amount: amt,
          mode,
          reference: reference.trim(),
          remarks: remarks.trim(),
          academicYear: st.academicYear,
          feeHeads: selectedHeadRows.map(({ structureId, position }) => ({
            structureId,
            position,
          })),
        },
      });
      await refreshCollection(COLLECTIONS.payments);
      toast.success(`Payment collected successfully. Receipt #${p.receiptNo} generated.`);
      setAmount("");
      setReference("");
      setRemarks("");
      setSelectedHeads([]);
      setError("");
      setReceipt(p);
    } catch (requestError) {
      setError(requestError.message || "Could not collect payment.");
    }
  };
  return (
    <>
      <PageHeader title="Fee Collection" subtitle={`Collect fees for academic year ${year}`} />
      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="Find student" className="xl:col-span-1">
          <SearchBar value={q} onChange={setQ} placeholder="Admission no, name or phone" />
          <ul className="mt-3 space-y-2">
            {matches.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setSelId(s.id);
                    setSelectedHeads([]);
                    setAmount("");
                    setError("");
                  }}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent",
                    selId === s.id ? "border-primary bg-accent" : "border-border",
                  )}
                >
                  <p className="text-sm font-medium">{fullName(s)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.admissionNo} · {s.className} {s.section}
                  </p>
                </button>
              </li>
            ))}
            {q.trim().length >= 2 && matches.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No matching students.
              </p>
            )}
          </ul>
        </SectionCard>

        <div className="space-y-5 xl:col-span-2">
          {!st || !f ? (
            <SectionCard>
              <EmptyState
                icon={Search}
                title="Select a student"
                description="Search by admission number, name or phone to begin collecting fees."
              />
            </SectionCard>
          ) : (
            <>
              <SectionCard
                title={fullName(st)}
                description={`${st.admissionNo} · ${st.className} · Section ${st.section}`}
                actions={<StatusBadge status={f.status} />}
              >
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                  <KeyValue label="Total fee" value={inr(f.total)} />
                  <KeyValue label="Discount" value={inr(f.discount)} />
                  <KeyValue label="Paid" value={inr(f.paid)} />
                  <KeyValue
                    label="Pending"
                    value={inr(f.payable - f.paid > 0 ? f.payable - f.paid : 0)}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Balance</p>
                    <p className="text-lg font-bold text-primary">{inr(f.balance)}</p>
                  </div>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Collect</TableHead>
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
                            <Checkbox
                              checked={selectedHeads.includes(h.key)}
                              disabled={h.balance <= 0}
                              onCheckedChange={(checked) => {
                                setSelectedHeads((current) =>
                                  checked
                                    ? [...current, h.key]
                                    : current.filter((key) => key !== h.key),
                                );
                                setError("");
                              }}
                              aria-label={`Select ${h.structureName} ${h.name}`}
                            />
                          </TableCell>
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
                </div>
              </SectionCard>

              <SectionCard title="Collect payment">
                {f.balance <= 0 ? (
                  <p className="rounded-xl bg-success/12 p-4 text-sm text-success">
                    All fees are fully paid for this student.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <p className="text-sm text-muted-foreground md:col-span-2">
                      Select which fee heads this payment should cover. Selected balance:{" "}
                      <span className="font-medium text-foreground">
                        {inr(selectedHeadBalance)}
                      </span>
                    </p>
                    <Field label="Amount (₹)" required>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            setError("");
                          }}
                        />
                        <Button
                          variant="outline"
                          type="button"
                          disabled={!selectedHeadRows.length}
                          onClick={() => setAmount(String(selectedHeadBalance))}
                        >
                          Full
                        </Button>
                      </div>
                    </Field>
                    <Field label="Payment mode" required>
                      <Select value={mode} onValueChange={(v) => setMode(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Cash", "UPI", "Card", "Bank Transfer"].map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Transaction / reference no" required={mode !== "Cash"}>
                      <Input value={reference} onChange={(e) => setReference(e.target.value)} />
                    </Field>
                    <Field label="Date">
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </Field>
                    <Field label="Remarks" className="md:col-span-2">
                      <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </Field>
                    {error && (
                      <p className="text-sm font-medium text-destructive md:col-span-2">{error}</p>
                    )}
                    <div className="md:col-span-2">
                      <Button size="lg" onClick={collect}>
                        <CreditCard className="mr-2 size-4" /> Collect & generate receipt
                      </Button>
                    </div>
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>
      <ReceiptDialog payment={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
