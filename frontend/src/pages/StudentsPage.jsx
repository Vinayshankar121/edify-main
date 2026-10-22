import { Link, useNavigate } from "@tanstack/react-router";
import { Archive, Download, Eye, GraduationCap, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, PageHeader, SearchBar, SectionCard, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
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
import { downloadStudentWorkbook } from "@/lib/reportExport";
import { apiRequest } from "@/lib/api";
import { COLLECTIONS, refreshCollection } from "@/lib/store";
const ALL = "all";
const PAGE = 12;
export function StudentsPage({ base, initialQuery = "" }) {
  const isAdmin = base === "/admin";
  const navigate = useNavigate();
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: structures } = useFeeStructures();
  const { data: classes } = useClasses();
  const { data: year } = useActiveYear();
  const [q, setQ] = useState(initialQuery);
  const [cls, setCls] = useState(ALL);
  const [sec, setSec] = useState(ALL);
  const [gender, setGender] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [exporting, setExporting] = useState(false);
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students
      .filter((s) => s.academicYear === year)
      .map((s) => ({ s, f: feeSummary(s, structures, payments) }))
      .filter(({ s, f }) => {
        if (cls !== ALL && s.className !== cls) return false;
        if (sec !== ALL && s.section !== sec) return false;
        if (gender !== ALL && s.gender !== gender) return false;
        if (status !== ALL && f.status !== status) return false;
        if (!term) return true;
        return [
          fullName(s),
          s.admissionNo,
          s.fatherPhone,
          s.motherPhone,
          s.guardianPhone,
          s.className,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [students, structures, payments, q, cls, sec, gender, status, year]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);
  const sections = classes.find((c) => c.name === cls)?.sections ?? [];
  const profile = (id) =>
    navigate({ to: isAdmin ? "/admin/students/$id" : "/cashier/students/$id", params: { id } });
  const exportStudents = async () => {
    setExporting(true);
    try {
      await downloadStudentWorkbook({ academicYear: year, students, structures, payments });
      toast.success("Class-wise Excel files downloaded in a ZIP archive.");
    } catch (error) {
      toast.error(`Could not export student workbook: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${rows.length} students · Academic year ${year}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportStudents} disabled={exporting}>
              <Download className="mr-2 size-4" />
              {exporting ? "Preparing files..." : "Download class-wise Excel"}
            </Button>
            {isAdmin && (
              <Button asChild>
                <Link to="/admin/admissions">
                  <Plus className="mr-2 size-4" /> Add student
                </Link>
              </Button>
            )}
          </div>
        }
      />
      <SectionCard>
        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SearchBar
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, admission no, phone, class"
            className="md:col-span-2"
          />
          <Select
            value={cls}
            onValueChange={(v) => {
              setCls(v);
              setSec(ALL);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Class">
              <SelectValue placeholder="Class" />
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
          <Select
            value={sec}
            onValueChange={(v) => {
              setSec(v);
              setPage(1);
            }}
          >
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
          <Select
            value={gender}
            onValueChange={(v) => {
              setGender(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Gender">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All genders</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Fee status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Any fee status</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description="Try changing the search or filters."
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Parent phone</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map(({ s, f }) => (
                    <TableRow key={s.id} className="animate-rise">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                            {s.firstName.charAt(0)}
                          </span>
                          <div>
                            <p className="font-medium">{fullName(s)}</p>
                            <p className="text-xs text-muted-foreground">{s.gender}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{s.admissionNo}</TableCell>
                      <TableCell>
                        {s.className} · {s.section}
                      </TableCell>
                      <TableCell>{s.fatherPhone || s.guardianPhone}</TableCell>
                      <TableCell className="text-right font-medium">{inr(f.balance)}</TableCell>
                      <TableCell>
                        <StatusBadge status={f.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="View"
                          onClick={() => profile(s.id)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button size="icon" variant="ghost" aria-label="Edit" asChild>
                              <Link to="/admin/admissions" search={{ edit: s.id }}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Archive"
                              onClick={() => setDel(s.id)}
                            >
                              <Archive className="size-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="grid gap-3 md:hidden">
              {visible.map(({ s, f }) => (
                <button
                  key={s.id}
                  onClick={() => profile(s.id)}
                  className="animate-rise rounded-xl border border-border p-4 text-left"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{fullName(s)}</p>
                    <StatusBadge status={f.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.admissionNo} · {s.className} {s.section}
                  </p>
                  <p className="mt-2 text-sm">
                    Balance <b>{inr(f.balance)}</b>
                  </p>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
      <ConfirmDialog
        open={!!del}
        title="Archive student?"
        description="This hides the student from active lists. Admissions, fees, payments and receipts remain permanently available for audit."
        onCancel={() => setDel(null)}
        onConfirm={async () => {
          await apiRequest(`/students/${del}/archive`, { method: "PATCH", body: {} });
          await refreshCollection(COLLECTIONS.students);
          setDel(null);
          toast.success("Student archived. Fee and receipt history was preserved.");
        }}
      />
    </>
  );
}
