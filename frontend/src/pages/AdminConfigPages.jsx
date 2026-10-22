import {
  CalendarRange,
  Check,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  EmptyState,
  Field,
  KeyValue,
  PageHeader,
  SearchBar,
  SectionCard,
  StatusBadge,
} from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { requiredFeeTotal } from "@/lib/fees";
import {
  uid,
  useAcademicYears,
  useActiveYear,
  useCashiers,
  useClasses,
  useFeeStructures,
  useFeeTerms,
  useSettings,
  useStudents,
} from "@/hooks/useSchoolData";
import { apiRequest } from "@/lib/api";
import { COLLECTIONS, refreshCollection } from "@/lib/store";
import { inr, structureTotal, today } from "@/lib/fees";
import { StudentPromotionPanel } from "@/pages/StudentPromotionPanel";

const parseSections = (value) => [
  ...new Set(
    value
      .split(/[,;\n]+/)
      .map((section) => section.trim().toUpperCase())
      .filter(Boolean),
  ),
];

/* ---------------- Classes & Sections ---------------- */
export function ClassesPage() {
  const { data: classes, setData } = useClasses();
  const { data: students, setData: setStudents } = useStudents();
  const { data: structures } = useFeeStructures();
  const { data: year } = useActiveYear();
  const [edit, setEdit] = useState(null);
  const [name, setName] = useState("");
  const [sections, setSections] = useState("");
  const [del, setDel] = useState(null);
  const [assign, setAssign] = useState(null);
  const open = (c) => {
    setEdit(c ?? { id: "", name: "", sections: [] });
    setName(c?.name ?? "");
    setSections(c?.sections.join(", ") ?? "A");
  };
  const save = () => {
    const secs = parseSections(sections);
    if (!name.trim() || secs.length === 0)
      return toast.error("Class name and at least one section are required.");
    if (edit?.id) {
      setData(
        classes.map((c) => (c.id === edit.id ? { ...c, name: name.trim(), sections: secs } : c)),
      );
      if (edit.name !== name.trim())
        setStudents(
          students.map((s) => (s.className === edit.name ? { ...s, className: name.trim() } : s)),
        );
      toast.success("Class updated.");
    } else {
      const existing = classes.find(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (existing) {
        const mergedSections = [
          ...new Set([...existing.sections, ...secs].map((section) => section.toUpperCase())),
        ];
        if (mergedSections.length === existing.sections.length) {
          return toast.error("Those sections already exist for this class.");
        }
        setData(
          classes.map((c) => (c.id === existing.id ? { ...c, sections: mergedSections } : c)),
        );
        toast.success(`Sections added to ${existing.name}.`);
      } else {
        setData([...classes, { id: uid(), name: name.trim(), sections: secs }]);
        toast.success("Class added.");
      }
    }
    setEdit(null);
  };
  return (
    <>
      <PageHeader
        title="Classes & Sections"
        subtitle={`${classes.length} classes`}
        actions={
          <Button onClick={() => open(null)}>
            <Plus className="mr-2 size-4" /> Add class
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {classes.map((c) => {
          const cs = students.filter((s) => s.className === c.name && s.academicYear === year);
          const st = structures.find((s) => s.className === c.name && s.active);
          return (
            <div
              key={c.id}
              className="surface animate-rise p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {cs.length} students · {c.sections.length} sections
                  </p>
                </div>
                <div className="flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit class"
                    onClick={() => open(c)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete class"
                    onClick={() => setDel(c)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {c.sections.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="border-primary/30 bg-accent text-accent-foreground"
                  >
                    {s} · {cs.filter((x) => x.section === s).length}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                <span className="text-muted-foreground">
                  {st ? `${st.name} · ${inr(structureTotal(st))}` : "No fee structure"}
                </span>
                <Button size="sm" variant="outline" onClick={() => setAssign(c)}>
                  Assign
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit class" : "Add class"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Class name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Class 7" />
            </Field>
            <Field label="Sections (separate with commas, semicolons, or new lines)" required>
              <Textarea
                value={sections}
                onChange={(e) => setSections(e.target.value)}
                placeholder="A, B, C"
                rows={3}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignDialog cls={assign} onClose={() => setAssign(null)} />

      <ConfirmDialog
        open={!!del}
        title={`Delete ${del?.name}?`}
        description={
          students.some((s) => s.className === del?.name)
            ? "Students are still assigned to this class. Reassign them first."
            : "This class and its sections will be removed."
        }
        onCancel={() => setDel(null)}
        onConfirm={() => {
          if (students.some((s) => s.className === del?.name))
            toast.error("Cannot delete a class with students.");
          else {
            setData(classes.filter((c) => c.id !== del?.id));
            toast.success("Class deleted.");
          }
          setDel(null);
        }}
      />
    </>
  );
}
function AssignDialog({ cls, onClose }) {
  const { data: students, setData } = useStudents();
  const { data: year } = useActiveYear();
  const [sid, setSid] = useState("");
  const [sec, setSec] = useState("");
  useEffect(() => {
    setSid("");
    setSec(cls?.sections[0] ?? "");
  }, [cls]);
  const pool = students.filter((s) => s.academicYear === year);
  return (
    <Dialog open={!!cls} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign student to {cls?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Student">
            <Select value={sid || undefined} onValueChange={setSid}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {pool.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} · {s.className} {s.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Section">
            <Select value={sec} onValueChange={setSec}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cls?.sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button
            disabled={!sid}
            onClick={() => {
              setData(
                students.map((s) =>
                  s.id === sid ? { ...s, className: cls.name, section: sec } : s,
                ),
              );
              toast.success("Student assigned.");
              onClose();
            }}
          >
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
/* ---------------- Fee Structure ---------------- */
const DEFAULT_HEADS = [
  "Tuition Fee",
  "Admission Fee",
  "Transport Fee",
  "Books",
  "Uniform",
  "Examination Fee",
  "Activity Fee",
  "Other Fee",
];
export function FeeStructurePage() {
  const { data: structures } = useFeeStructures();
  const { data: classes } = useClasses();
  const { data: years } = useAcademicYears();
  const { data: year } = useActiveYear();
  const { data: students } = useStudents();
  const [edit, setEdit] = useState(null);
  const [del, setDel] = useState(null);
  const blank = () => ({
    id: "",
    name: "",
    className: classes[0]?.name ?? "",
    academicYear: year,
    active: true,
    heads: DEFAULT_HEADS.map((name) => ({ name, amount: 0 })),
  });
  const setHead = (i, h) =>
    edit && setEdit({ ...edit, heads: edit.heads.map((x, j) => (j === i ? { ...x, ...h } : x)) });
  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim() || !edit.className) return toast.error("Name and class are required.");
    const heads = edit.heads.filter((h) => h.name.trim() && h.amount > 0);
    if (heads.length === 0) return toast.error("Add at least one fee head with an amount.");
    const next = { ...edit, active: Boolean(edit.active), heads };
    try {
      await apiRequest(
        edit.id ? `/fee-structures/${encodeURIComponent(edit.id)}` : "/fee-structures",
        {
          method: edit.id ? "PATCH" : "POST",
          body: edit.id ? next : { ...next, id: uid() },
        },
      );
      await refreshCollection(COLLECTIONS.feeStructures);
      toast.success("Fee structure saved.");
      setEdit(null);
    } catch (error) {
      toast.error(`Could not save fee structure: ${error.message}`);
    }
  };
  const setActive = async (structure, active) => {
    try {
      await apiRequest(`/fee-structures/${encodeURIComponent(structure.id)}`, {
        method: "PATCH",
        body: { ...structure, active },
      });
      await refreshCollection(COLLECTIONS.feeStructures);
      toast.success(active ? "Structure activated." : "Structure deactivated.");
    } catch (error) {
      toast.error(`Could not update fee structure: ${error.message}`);
    }
  };
  const list = structures.filter((s) => s.academicYear === year);
  return (
    <>
      <PageHeader
        title="Fee Structure"
        subtitle={`Academic year ${year}`}
        actions={
          <Button onClick={() => setEdit(blank())}>
            <Plus className="mr-2 size-4" /> Create structure
          </Button>
        }
      />
      {list.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={Wallet}
            title="No fee structures for this year"
            action={<Button onClick={() => setEdit(blank())}>Create structure</Button>}
          />
        </SectionCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((s) => (
            <SectionCard
              key={s.id}
              title={s.name}
              description={`${s.className} · ${students.filter((x) => x.structureIds?.includes(s.id) || x.structureId === s.id).length} students`}
              actions={
                <>
                  <StatusBadge status={s.active ? "active" : "inactive"} />
                  <Switch
                    checked={s.active}
                    aria-label="Active"
                    onCheckedChange={(v) => setActive(s, v)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit"
                    onClick={() => setEdit({ ...s, heads: [...s.heads] })}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => setDel(s)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </>
              }
            >
              <ul className="divide-y divide-border text-sm">
                {s.heads.map((h) => (
                  <li key={h.name} className="flex justify-between py-2">
                    <span>{h.name}</span>
                    <span>{inr(h.amount)}</span>
                  </li>
                ))}
                <li className="flex justify-between py-2 font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{inr(structureTotal(s))}</span>
                </li>
              </ul>
            </SectionCard>
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit fee structure" : "Create fee structure"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Name" required>
                  <Input
                    value={edit.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </Field>
                <Field label="Class" required>
                  <Select
                    value={edit.className}
                    onValueChange={(v) => setEdit({ ...edit, className: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                <Field label="Academic year">
                  <Select
                    value={edit.academicYear}
                    onValueChange={(v) => setEdit({ ...edit, academicYear: v })}
                  >
                    <SelectTrigger>
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
                </Field>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Fee heads</p>
                {edit.heads.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h.name}
                      onChange={(e) => setHead(i, { name: e.target.value })}
                      aria-label="Fee head name"
                    />
                    <Input
                      type="number"
                      className="w-36"
                      value={h.amount}
                      onChange={(e) => setHead(i, { amount: Number(e.target.value) })}
                      aria-label="Amount"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove head"
                      onClick={() =>
                        setEdit({ ...edit, heads: edit.heads.filter((_, j) => j !== i) })
                      }
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEdit({
                      ...edit,
                      heads: [...edit.heads, { name: "", amount: 0 }],
                    })
                  }
                >
                  <Plus className="mr-1 size-4" /> Add head
                </Button>
              </div>
              <p className="text-right font-semibold">Total {inr(structureTotal(edit))}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={save}>Save structure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!del}
        title={`Delete ${del?.name}?`}
        description="Students linked to this structure will show no fee."
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          if (!del) return;
          try {
            await apiRequest(`/fee-structures/${encodeURIComponent(del.id)}`, { method: "DELETE" });
            await refreshCollection(COLLECTIONS.feeStructures);
            setDel(null);
            toast.success("Fee structure deleted.");
          } catch (error) {
            toast.error(`Could not delete fee structure: ${error.message}`);
          }
        }}
      />
    </>
  );
}
/* ---------------- Fee Terms ---------------- */
export function FeeTermsPage() {
  const { data: structures } = useFeeStructures();
  const { data: terms, setData } = useFeeTerms();
  const { data: year } = useActiveYear();
  const list = structures.filter((s) => s.academicYear === year);
  const [sid, setSid] = useState("");
  const current = sid || list[0]?.id || "";
  const st = structures.find((s) => s.id === current);
  const mine = terms.filter((t) => t.structureId === current);
  const [draft, setDraft] = useState([]);
  useEffect(() => setDraft(mine.map((t) => ({ ...t }))), [current, terms.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = requiredFeeTotal(st);
  const sum = draft.reduce((t, x) => t + x.amount, 0);
  const upd = (i, p) => setDraft(draft.map((t, j) => (j === i ? { ...t, ...p } : t)));
  const split = (n) => {
    const each = Math.floor(total / n);
    setDraft(
      Array.from({ length: n }, (_, i) => ({
        id: uid(),
        structureId: current,
        name: `Term ${i + 1}`,
        amount: i === n - 1 ? total - each * (n - 1) : each,
        dueDate: "",
      })),
    );
  };
  const save = () => {
    if (draft.some((t) => !t.name || !t.dueDate || t.amount <= 0))
      return toast.error("Each installment needs a name, amount and due date.");
    if (Math.round(sum * 100) !== Math.round(total * 100))
      return toast.error(`Installments total ${inr(sum)} but the annual fee is ${inr(total)}.`);
    setData([...terms.filter((t) => t.structureId !== current), ...draft]);
    toast.success("Installment schedule saved.");
  };
  return (
    <>
      <PageHeader
        title="Fee Terms / Installments"
        subtitle="Configure installment schedules for each fee structure."
      />
      {list.length === 0 ? (
        <SectionCard>
          <EmptyState icon={CalendarRange} title="Create a fee structure first" />
        </SectionCard>
      ) : (
        <SectionCard
          title={st?.name}
          description={`Required annual fees ${inr(total)}`}
          actions={
            <Select value={current} onValueChange={setSid}>
              <SelectTrigger className="w-64" aria-label="Fee structure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {list.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((n) => (
              <Button key={n} variant="outline" size="sm" onClick={() => split(n)}>
                Split into {n}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {draft.map((t, i) => (
              <div
                key={t.id}
                className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_160px_180px_auto]"
              >
                <Input
                  value={t.name}
                  onChange={(e) => upd(i, { name: e.target.value })}
                  aria-label="Installment name"
                />
                <Input
                  type="number"
                  value={t.amount}
                  onChange={(e) => upd(i, { amount: Number(e.target.value) })}
                  aria-label="Amount"
                />
                <Input
                  type="date"
                  value={t.dueDate}
                  onChange={(e) => upd(i, { dueDate: e.target.value })}
                  aria-label="Due date"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Remove"
                  onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground">No installments yet.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() =>
                setDraft([
                  ...draft,
                  {
                    id: uid(),
                    structureId: current,
                    name: `Term ${draft.length + 1}`,
                    amount: 0,
                    dueDate: "",
                  },
                ])
              }
            >
              <Plus className="mr-1 size-4" /> Add installment
            </Button>
            <div className="flex items-center gap-3">
              <span className={sum === total ? "text-sm text-success" : "text-sm text-destructive"}>
                Scheduled {inr(sum)} / {inr(total)}
              </span>
              <Button onClick={save}>Save schedule</Button>
            </div>
          </div>
        </SectionCard>
      )}
    </>
  );
}
/* ---------------- Academic Years ---------------- */
export function AcademicYearsPage() {
  const { data: years, setData } = useAcademicYears();
  const { data: active, setData: setActive } = useActiveYear();
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const add = () => {
    if (!/^\d{4}-\d{4}$/.test(name)) return toast.error("Use the format 2028-2029.");
    if (years.some((y) => y.name === name)) return toast.error("Year already exists.");
    setData([...years, { id: uid(), name, active: false }]);
    setName("");
    toast.success("Academic year added.");
  };
  const makeActive = (n) => {
    setActive(n);
    toast.success(`${n} is now the active academic year.`);
  };
  return (
    <>
      <PageHeader title="Academic Years" subtitle={`Currently active: ${active}`} />
      <SectionCard title="Add academic year" className="mb-5">
        <div className="flex max-w-md gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="2028-2029" />
          <Button onClick={add}>
            <Plus className="mr-1 size-4" /> Add
          </Button>
        </div>
      </SectionCard>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {years.map((y) => {
          const isActive = y.name === active;
          return (
            <div
              key={y.id}
              className={`surface animate-rise p-5 ${isActive ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                {editId === y.id ? (
                  <div className="flex gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 w-32"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Save"
                      onClick={() => {
                        if (!/^\d{4}-\d{4}$/.test(editName))
                          return toast.error("Use the format 2028-2029.");
                        setData(years.map((x) => (x.id === y.id ? { ...x, name: editName } : x)));
                        setEditId(null);
                        toast.success("Academic year updated.");
                      }}
                    >
                      <Check className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <h3 className="text-xl font-semibold">{y.name}</h3>
                )}
                {isActive ? (
                  <Badge>Active</Badge>
                ) : y.closed ? (
                  <Badge variant="outline">Closed</Badge>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {!isActive && !y.closed && (
                  <Button size="sm" onClick={() => makeActive(y.name)}>
                    Set active
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditId(y.id);
                    setEditName(y.name);
                  }}
                >
                  <Pencil className="mr-1 size-3.5" /> Edit
                </Button>
                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setData(years.map((x) => (x.id === y.id ? { ...x, closed: !x.closed } : x)));
                      toast.success(y.closed ? "Year reopened." : "Year closed.");
                    }}
                  >
                    {y.closed ? "Reopen" : "Close year"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <StudentPromotionPanel />
    </>
  );
}
/* ---------------- Cashiers ---------------- */
const blankCashier = () => ({
  id: "",
  name: "",
  employeeId: "",
  email: "",
  phone: "",
  username: "",
  password: "",
  status: "active",
  createdAt: today(),
});
export function CashiersPage() {
  const { data: cashiers, setData } = useCashiers();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState(null);
  const [view, setView] = useState(null);
  const [reset, setReset] = useState(null);
  const [newPass, setNewPass] = useState("");
  const [del, setDel] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const list = cashiers.filter((c) =>
    [c.name, c.employeeId, c.username, c.phone].join(" ").toLowerCase().includes(q.toLowerCase()),
  );
  const save = async () => {
    if (!edit) return;
    const e = {};
    if (!edit.name.trim()) e.name = "Required";
    if (!edit.employeeId.trim()) e.employeeId = "Required";
    if (!/^\S+@\S+\.\S+$/.test(edit.email)) e.email = "Valid email required";
    if (!/^[6-9]\d{9}$/.test(edit.phone)) e.phone = "Valid 10-digit mobile required";
    if (!/^[a-z0-9_.]{3,}$/i.test(edit.username)) e.username = "At least 3 letters/numbers";
    else if (
      edit.username.toLowerCase() === "admin" ||
      cashiers.some(
        (c) => c.username.toLowerCase() === edit.username.toLowerCase() && c.id !== edit.id,
      )
    )
      e.username = "Username already taken";
    if (!edit.id && edit.password.length < 12) e.password = "Minimum 12 characters";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      if (edit.id) {
        const { createdAt, ...payload } = edit;
        await apiRequest(`/cashiers/${encodeURIComponent(edit.id)}`, {
          method: "PATCH",
          body: payload,
        });
        toast.success("Cashier updated.");
      } else {
        const { id, createdAt, ...payload } = edit;
        await apiRequest("/cashiers", { method: "POST", body: payload });
        toast.success("Cashier account created successfully.");
      }
      await refreshCollection(COLLECTIONS.cashiers);
      setEdit(null);
    } catch (error) {
      toast.error(`Could not save cashier: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  const f = (k, label, type = "text") => (
    <Field label={label} required error={errors[k]}>
      <Input
        type={type}
        value={String(edit?.[k] ?? "")}
        onChange={(e) => edit && setEdit({ ...edit, [k]: e.target.value })}
      />
    </Field>
  );
  return (
    <>
      <PageHeader
        title="Cashiers"
        subtitle="Control who can collect fees at the counter."
        actions={
          <Button
            onClick={() => {
              setErrors({});
              setEdit(blankCashier());
            }}
          >
            <Plus className="mr-2 size-4" /> Add cashier
          </Button>
        }
      />
      <SectionCard>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search cashiers"
          className="mb-4 max-w-sm"
        />
        {list.length === 0 ? (
          <EmptyState icon={Users} title="No cashiers found" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c) => (
                  <TableRow key={c.id} className="animate-rise">
                    <TableCell>
                      <button className="font-medium hover:text-primary" onClick={() => setView(c)}>
                        {c.name}
                      </button>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell>{c.employeeId}</TableCell>
                    <TableCell>{c.username}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.createdAt}</TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={c.status === "active" ? "Deactivate" : "Activate"}
                        onClick={() => {
                          setData(
                            cashiers.map((x) =>
                              x.id === c.id
                                ? { ...x, status: x.status === "active" ? "inactive" : "active" }
                                : x,
                            ),
                          );
                          toast.success(
                            c.status === "active" ? "Cashier deactivated." : "Cashier activated.",
                          );
                        }}
                      >
                        <Power className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Reset password"
                        onClick={() => {
                          setReset(c);
                          setNewPass("");
                        }}
                      >
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit"
                        onClick={() => {
                          setErrors({});
                          setEdit({ ...c });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete"
                        onClick={() => setDel(c)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Edit cashier" : "Add cashier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {f("name", "Full name")}
            {f("employeeId", "Employee ID")}
            {f("email", "Email", "email")}
            {f("phone", "Phone")}
            {f("username", "Username")}
            {!edit?.id && f("password", "Password", "password")}
            <Field label="Status">
              <Select
                value={edit?.status}
                onValueChange={(v) => edit && setEdit({ ...edit, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save cashier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{view?.name}</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="grid grid-cols-2 gap-4">
              <KeyValue label="Employee ID" value={view.employeeId} />
              <KeyValue label="Username" value={view.username} />
              <KeyValue label="Email" value={view.email} />
              <KeyValue label="Phone" value={view.phone} />
              <KeyValue label="Created" value={view.createdAt} />
              <KeyValue label="Status" value={<StatusBadge status={view.status} />} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password — {reset?.name}</DialogTitle>
          </DialogHeader>
          <Field label="New password" required>
            <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button
              onClick={() => {
                if (newPass.length < 12)
                  return toast.error("Password must be at least 12 characters.");
                setData(
                  cashiers.map((c) => (c.id === reset?.id ? { ...c, password: newPass } : c)),
                );
                setReset(null);
                toast.success("Password reset successfully.");
              }}
            >
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!del}
        title={`Delete ${del?.name}?`}
        description="They will no longer be able to sign in. Past receipts keep their name."
        onCancel={() => setDel(null)}
        onConfirm={() => {
          setData(cashiers.filter((c) => c.id !== del?.id));
          setDel(null);
          toast.success("Cashier deleted.");
        }}
      />
    </>
  );
}
/* ---------------- Settings ---------------- */
export function SettingsPage() {
  const { data, setData, ready } = useSettings();
  const [s, setS] = useState(data);
  useEffect(() => {
    if (ready) setS(data);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const f = (k, label, required = false) => (
    <Field label={label} required={required}>
      <Input value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </Field>
  );
  return (
    <>
      <PageHeader
        title="School Settings"
        subtitle="These details appear on receipts and reports."
      />
      <SectionCard title="School information">
        <div className="grid gap-4 md:grid-cols-2">
          {f("schoolName", "School name", true)}
          {f("tagline", "Tagline")}
          {f("location", "Location", true)}
          {f("principal", "Principal name")}
          {f("phone", "Phone")}
          {f("email", "Email")}
          {f("website", "Website")}
          <Field label="School logo">
            <p className="text-sm text-muted-foreground">
              The official NR Edify English Medium School logo is used across the app and on
              receipts.
            </p>
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Textarea value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} />
          </Field>
          <Field label="Receipt footer" className="md:col-span-2">
            <Textarea
              value={s.receiptFooter}
              onChange={(e) => setS({ ...s, receiptFooter: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => {
              if (!s.schoolName.trim()) return toast.error("School name is required.");
              setData(s);
              toast.success("Settings saved.");
            }}
          >
            Save settings
          </Button>
        </div>
      </SectionCard>
    </>
  );
}
