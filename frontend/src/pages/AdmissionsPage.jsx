import { useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BulkAdmissionActions } from "@/components/BulkAdmissionActions";
import { Field, KeyValue, PageHeader, SectionCard } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api";
import { COLLECTIONS, refreshCollection } from "@/lib/store";
import {
  useAcademicYears,
  useActiveYear,
  useClasses,
  useFeeStructures,
  useStudents,
} from "@/hooks/useSchoolData";
import { inr, studentFeeTotal, today } from "@/lib/fees";
import { cn } from "@/lib/utils";
const STEPS = ["Student", "Parents", "Academic", "Fees", "Review"];
const STUDENT_UPDATE_FIELDS = [
  "admissionNo",
  "studentId",
  "firstName",
  "lastName",
  "dob",
  "gender",
  "bloodGroup",
  "aadhaar",
  "admissionDate",
  "fatherName",
  "fatherPhone",
  "fatherEmail",
  "motherName",
  "motherPhone",
  "motherEmail",
  "guardianName",
  "guardianRelation",
  "guardianPhone",
  "address",
  "className",
  "section",
  "rollNo",
  "previousClass",
  "previousSchool",
  "feeCategory",
  "structureId",
  "structureIds",
  "discount",
];
const normalizedUpdateValue = (key, value) => {
  if (key === "dob" || key === "admissionDate") return String(value ?? "").slice(0, 10);
  if (key === "structureId") return value || null;
  if (key === "discount") return Number(value ?? 0);
  return value ?? "";
};
const empty = (year, n) => ({
  admissionNo: `EDF/${year.slice(0, 4)}/${String(n).padStart(3, "0")}`,
  studentId: `STU${String(1000 + n)}`,
  firstName: "",
  lastName: "",
  dob: "",
  gender: "Male",
  bloodGroup: "",
  aadhaar: "",
  admissionDate: today(),
  fatherName: "",
  fatherPhone: "",
  fatherEmail: "",
  motherName: "",
  motherPhone: "",
  motherEmail: "",
  guardianName: "",
  guardianRelation: "",
  guardianPhone: "",
  address: "",
  academicYear: year,
  className: "",
  section: "",
  rollNo: "",
  previousClass: "",
  previousSchool: "",
  feeCategory: "General",
  structureId: "",
  structureIds: [],
  discount: 0,
  initialPayment: 0,
  initialPaymentReference: "",
  paymentMode: "Cash",
});
const phoneOk = (v) => !v || /^[6-9]\d{9}$/.test(v);
const emailOk = (v) => !v || /^\S+@\S+\.\S+$/.test(v);
export function AdmissionsPage({ editId }) {
  const navigate = useNavigate();
  const { data: students, ready } = useStudents();
  const { data: classes } = useClasses();
  const { data: structures } = useFeeStructures();
  const { data: years } = useAcademicYears();
  const { data: activeYear } = useActiveYear();
  const editing = students.find((s) => s.id === editId);
  const [step, setStep] = useState(0);
  const [f, setF] = useState(() => empty(activeYear, 1));
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (!ready) return;
    if (editing) setF({ ...editing, initialPayment: 0, paymentMode: "Cash" });
    else setF(empty(activeYear, students.length + 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, editId, activeYear]);
  const set = (k, v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };
  const sections = classes.find((c) => c.name === f.className)?.sections ?? [];
  const classStructures = structures.filter(
    (s) => s.className === f.className && s.academicYear === f.academicYear && s.active,
  );
  const selectedStructureIds = f.structureIds?.length
    ? f.structureIds
    : f.structureId
      ? [f.structureId]
      : [];
  const selectedStructures = structures.filter((s) => selectedStructureIds.includes(s.id));
  const total = studentFeeTotal(selectedStructures, editId);
  const validate = (i) => {
    const e = {};
    if (i === 0) {
      if (!f.admissionNo) e.admissionNo = "Required";
      else if (students.some((s) => s.admissionNo === f.admissionNo && s.id !== editId))
        e.admissionNo = "Already exists";
      if (!f.firstName.trim()) e.firstName = "Required";
      if (!f.lastName.trim()) e.lastName = "Required";
      if (!f.dob) e.dob = "Required";
      else if (f.dob > today()) e.dob = "Date of birth cannot be in the future";
      if (f.admissionDate > today()) e.admissionDate = "Admission date cannot be in the future";
      if (f.aadhaar && !/^\d{12}$/.test(f.aadhaar.replace(/\s/g, "")))
        e.aadhaar = "Aadhaar must be 12 digits";
    }
    if (i === 1) {
      if (!f.fatherName.trim() && !f.guardianName.trim())
        e.fatherName = "Father or guardian name required";
      if (!f.fatherPhone && !f.guardianPhone)
        e.fatherPhone = "At least one contact number required";
      ["fatherPhone", "motherPhone", "guardianPhone"].forEach((k) => {
        if (!phoneOk(f[k])) e[k] = "Enter a valid 10-digit mobile";
      });
      ["fatherEmail", "motherEmail"].forEach((k) => {
        if (!emailOk(f[k])) e[k] = "Enter a valid email";
      });
      if (!f.address.trim()) e.address = "Required";
    }
    if (i === 2) {
      if (!f.className) e.className = "Required";
      if (!f.section) e.section = "Required";
    }
    if (i === 3) {
      if (selectedStructureIds.length === 0) e.structureIds = "Select at least one fee structure";
      if (f.discount < 0 || f.discount > total)
        e.discount = "Discount must be between 0 and total fee";
      if (f.initialPayment < 0 || f.initialPayment > total - f.discount)
        e.initialPayment = "Cannot exceed payable amount";
      if (f.initialPayment > 0 && f.paymentMode !== "Cash" && !f.initialPaymentReference.trim())
        e.initialPaymentReference = "Required for non-cash payments";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => validate(step) && setStep((s) => Math.min(s + 1, 4));
  const submit = async () => {
    const { initialPayment, initialPaymentReference, paymentMode, ...data } = f;
    if (editing) {
      const changes = Object.fromEntries(
        STUDENT_UPDATE_FIELDS.map((key) => [key, normalizedUpdateValue(key, data[key])]).filter(
          ([key, value]) => value !== normalizedUpdateValue(key, editing[key]),
        ),
      );
      if (Object.keys(changes).length === 0) {
        toast.info("No student changes to save.");
        return;
      }
      try {
        await apiRequest(`/students/${encodeURIComponent(editing.id)}`, {
          method: "PATCH",
          body: changes,
        });
      } catch (error) {
        const details = Object.entries(error.details?.fieldErrors ?? {})
          .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
          .join("; ");
        toast.error(`Could not update student: ${details || error.message}`);
        return;
      }
      try {
        await refreshCollection(COLLECTIONS.students);
      } catch (error) {
        toast.error(
          `Student was saved, but the student list could not be refreshed: ${error.message}`,
        );
        return;
      }
      toast.success("Student details updated.");
      navigate({ to: "/admin/students/$id", params: { id: editing.id } });
      return;
    }
    try {
      const created = await apiRequest("/students", {
        method: "POST",
        body: { ...data, initialPayment, initialPaymentReference, paymentMode },
      });
      await Promise.all([
        refreshCollection(COLLECTIONS.students),
        ...(initialPayment > 0 ? [refreshCollection(COLLECTIONS.payments)] : []),
      ]);
      if (created.payment) {
        toast.success(
          `Student successfully admitted. Receipt #${created.payment.receiptNo} generated.`,
        );
      } else toast.success("Student successfully admitted.");
      navigate({ to: "/admin/students/$id", params: { id: created.id } });
    } catch (error) {
      toast.error(error.message || "Could not complete admission.");
    }
  };
  const inp = (k, label, opts = {}) => (
    <Field label={label} required={opts.required} error={errors[k]}>
      <Input
        type={opts.type ?? "text"}
        value={String(f[k] ?? "")}
        placeholder={opts.placeholder}
        max={opts.max}
        aria-invalid={!!errors[k]}
        onChange={(e) => set(k, opts.type === "number" ? Number(e.target.value) : e.target.value)}
      />
    </Field>
  );
  const review = useMemo(
    () => [
      ["Student", `${f.firstName} ${f.lastName}`],
      ["Admission No", f.admissionNo],
      ["DOB", f.dob],
      ["Gender", f.gender],
      ["Father", f.fatherName],
      ["Contact", f.fatherPhone || f.guardianPhone],
      ["Mother", f.motherName],
      ["Address", f.address],
      ["Year", f.academicYear],
      ["Class", `${f.className} ${f.section}`],
      ["Roll No", f.rollNo],
      ["Fee structures", selectedStructures.map((item) => item.name).join(", ")],
      ["Total fee", inr(total)],
      ["Discount", inr(f.discount)],
      ["Payable", inr(total - f.discount)],
      ["Initial payment", `${inr(f.initialPayment)} · ${f.paymentMode}`],
    ],
    [f, selectedStructures, total],
  );
  return (
    <>
      <PageHeader
        title={editing ? "Edit student" : "New admission"}
        subtitle="Complete each step — fields marked * are required."
        actions={
          !editing && (
            <BulkAdmissionActions
              students={students}
              classes={classes}
              structures={structures}
              years={years}
              onCreated={async ({ hasPayments }) =>
                Promise.all([
                  refreshCollection(COLLECTIONS.students),
                  ...(hasPayments ? [refreshCollection(COLLECTIONS.payments)] : []),
                ])
              }
            />
          )
        }
      />
      <div className="surface animate-rise mb-6 p-5">
        <div className="flex items-center justify-between gap-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => i < step && setStep(i)}
              className="flex flex-1 flex-col items-center gap-2 text-center"
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  i < step
                    ? "border-primary bg-primary text-primary-foreground"
                    : i === step
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground",
                )}
              >
                {i < step ? <Check className="size-4" /> : i + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:block",
                  i === step ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
        <Progress value={(step / 4) * 100} className="mt-4 h-1.5" />
      </div>

      <SectionCard
        key={step}
        title={
          [
            "Student information",
            "Parent / guardian information",
            "Academic information",
            "Fee information",
            "Review & submit",
          ][step]
        }
      >
        {step === 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inp("admissionNo", "Admission number", { required: true })}
            {inp("studentId", "Student ID")}
            {inp("admissionDate", "Admission date", { type: "date", max: today() })}
            {inp("firstName", "First name", { required: true })}
            {inp("lastName", "Last name", { required: true })}
            {inp("dob", "Date of birth", { required: true, type: "date", max: today() })}
            <Field label="Gender" required>
              <Select value={f.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Male", "Female", "Other"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Blood group">
              <Select value={f.bloodGroup || undefined} onValueChange={(v) => set("bloodGroup", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {inp("aadhaar", "Aadhaar / ID number", { placeholder: "12 digits" })}
            {inp("previousSchool", "Previous school")}
          </div>
        )}
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-3">
            {inp("fatherName", "Father's name", { required: true })}
            {inp("fatherPhone", "Father's phone", { required: true })}
            {inp("fatherEmail", "Father's email", { type: "email" })}
            {inp("motherName", "Mother's name")}
            {inp("motherPhone", "Mother's phone")}
            {inp("motherEmail", "Mother's email", { type: "email" })}
            {inp("guardianName", "Guardian name")}
            {inp("guardianRelation", "Relationship")}
            {inp("guardianPhone", "Guardian phone")}
            <Field label="Address" required error={errors.address} className="md:col-span-3">
              <Textarea value={f.address} onChange={(e) => set("address", e.target.value)} />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Academic year" required>
              <Select
                value={f.academicYear}
                onValueChange={(v) => {
                  set("academicYear", v);
                  set("structureId", "");
                  set("structureIds", []);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years
                    .filter((y) => !y.closed)
                    .map((y) => (
                      <SelectItem key={y.id} value={y.name}>
                        {y.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Class" required error={errors.className}>
              <Select
                value={f.className || undefined}
                onValueChange={(v) => {
                  set("className", v);
                  set("section", "");
                  set("structureId", "");
                  set("structureIds", []);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Section" required error={errors.section}>
              <Select
                value={f.section || undefined}
                onValueChange={(v) => set("section", v)}
                disabled={!f.className}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      Section {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {inp("rollNo", "Roll number")}
            {inp("previousClass", "Previous class")}
            {inp("previousSchool", "Previous school")}
          </div>
        )}
        {step === 3 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Fee category">
              <Select value={f.feeCategory} onValueChange={(v) => set("feeCategory", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["General", "Staff Ward", "Sibling", "Scholarship"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Applicable fee structures"
              required
              error={errors.structureIds}
              className="md:col-span-2"
            >
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  Create separate structures such as Normal and Transport. Select every structure
                  that applies; students without transport should have only the normal structure
                  selected.
                </p>
                {classStructures.length ? (
                  classStructures.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedStructureIds.includes(item.id)}
                        onCheckedChange={(checked) => {
                          const nextIds = checked
                            ? [...selectedStructureIds, item.id]
                            : selectedStructureIds.filter((id) => id !== item.id);
                          set("structureIds", nextIds);
                          set("structureId", nextIds[0] ?? "");
                        }}
                      />
                      <span>
                        {item.name} · {inr(studentFeeTotal(item, editId))}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No active fee structures for this class and academic year.
                  </p>
                )}
              </div>
            </Field>
            {inp("discount", "Discount (₹)", { type: "number" })}
            {!editing && inp("initialPayment", "Initial payment (₹)", { type: "number" })}
            {!editing && (
              <Field label="Payment mode">
                <Select value={f.paymentMode} onValueChange={(v) => set("paymentMode", v)}>
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
            )}
            {!editing &&
              f.initialPayment > 0 &&
              f.paymentMode !== "Cash" &&
              inp("initialPaymentReference", "Payment reference", { required: true })}
            {selectedStructures.length > 0 && (
              <div className="rounded-xl bg-accent p-4 text-sm text-accent-foreground md:col-span-3">
                Total {inr(total)} − discount {inr(f.discount)} ={" "}
                <b>{inr(total - f.discount)} payable</b>
              </div>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {review.map(([k, v]) => (
              <KeyValue key={k} label={k} value={v} />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t border-border pt-5">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="mr-1 size-4" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={next}>
              Continue <ChevronRight className="ml-1 size-4" />
            </Button>
          ) : (
            <Button onClick={submit}>
              <Check className="mr-2 size-4" /> {editing ? "Save changes" : "Submit admission"}
            </Button>
          )}
        </div>
      </SectionCard>
    </>
  );
}
