import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAcademicYears,
  useActiveYear,
  useClasses,
  useFeeStructures,
  useStudents,
} from "@/hooks/useSchoolData";
import { apiRequest } from "@/lib/api";
import { COLLECTIONS, refreshCollection } from "@/lib/store";

function classSections(classRecord) {
  if (!classRecord) return [];
  const sections = Array.isArray(classRecord.sections)
    ? classRecord.sections
    : String(classRecord.sections ?? "").split(/[,;\n]+/);
  return [
    ...new Set(sections.map((section) => String(section).trim().toUpperCase()).filter(Boolean)),
  ];
}

export function StudentPromotionPanel() {
  const { data: students } = useStudents();
  const { data: years } = useAcademicYears();
  const { data: activeYear } = useActiveYear();
  const { data: classes } = useClasses();
  const { data: structures } = useFeeStructures();
  const orderedClasses = useMemo(
    () =>
      [...classes].sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" }),
      ),
    [classes],
  );
  const [sourceYear, setSourceYear] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [choices, setChoices] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSourceYear(activeYear), [activeYear]);
  useEffect(() => {
    if (targetYear && targetYear !== sourceYear) return;
    const laterYear = years
      .filter(
        (year) =>
          !year.closed &&
          year.name !== sourceYear &&
          year.name.slice(0, 4) > sourceYear.slice(0, 4),
      )
      .sort((left, right) => left.name.localeCompare(right.name))[0];
    const fallbackYear = years.find((year) => !year.closed && year.name !== sourceYear);
    setTargetYear(laterYear?.name ?? fallbackYear?.name ?? "");
  }, [years, sourceYear, targetYear]);

  const sourceStudents = useMemo(
    () => students.filter((student) => student.academicYear === sourceYear),
    [students, sourceYear],
  );

  useEffect(() => {
    if (!sourceYear || !targetYear) {
      setChoices({});
      return;
    }
    const initial = {};
    for (const student of sourceStudents) {
      const sourceClassIndex = orderedClasses.findIndex((item) => item.name === student.className);
      const isFinalClass = sourceClassIndex === orderedClasses.length - 1 && sourceClassIndex >= 0;
      const targetClass =
        sourceClassIndex < 0 || isFinalClass ? null : orderedClasses[sourceClassIndex + 1];
      const sections = classSections(targetClass);
      const currentSection = String(student.section ?? "")
        .trim()
        .toUpperCase();
      const section = sections.includes(currentSection) ? currentSection : (sections[0] ?? "");
      const structure = structures.find(
        (item) =>
          item.academicYear === targetYear && item.className === targetClass?.name && item.active,
      );
      initial[student.id] = {
        selected: Boolean(!isFinalClass && targetClass && section && structure),
        className: targetClass?.name ?? "",
        section,
        structureIds: structure ? [structure.id] : [],
        structureId: structure?.id ?? "",
        discount: student.discount ?? 0,
        isFinalClass,
      };
    }
    setChoices(initial);
  }, [sourceYear, targetYear, sourceStudents, orderedClasses, structures]);

  const selected = sourceStudents.filter((student) => choices[student.id]?.selected);
  const updateChoice = (id, update) =>
    setChoices((current) => ({ ...current, [id]: { ...current[id], ...update } }));

  const changeClass = (studentId, className) => {
    const next = classes.find((item) => item.name === className);
    const sections = classSections(next);
    const structure = structures.find(
      (item) => item.academicYear === targetYear && item.className === className && item.active,
    );
    updateChoice(studentId, {
      className,
      section: sections[0] ?? "",
      structureIds: structure ? [structure.id] : [],
      structureId: structure?.id ?? "",
    });
  };

  const promote = async () => {
    if (!selected.length) return toast.error("Select at least one student to promote.");
    const invalid = selected.find((student) => {
      const choice = choices[student.id];
      return (
        !choice.className ||
        !choice.section ||
        !(choice.structureIds?.length || choice.structureId) ||
        choice.discount < 0
      );
    });
    if (invalid)
      return toast.error(`Complete the target enrollment details for ${invalid.firstName}.`);

    setSaving(true);
    try {
      const promoted = await apiRequest("/promotions", {
        method: "POST",
        body: {
          sourceAcademicYear: sourceYear,
          targetAcademicYear: targetYear,
          students: selected.map((student) => ({
            enrollmentId: student.id,
            className: choices[student.id].className,
            section: choices[student.id].section,
            structureIds: choices[student.id].structureIds?.length
              ? choices[student.id].structureIds
              : [choices[student.id].structureId],
            structureId: choices[student.id].structureId,
            discount: Number(choices[student.id].discount),
          })),
        },
      });
      await refreshCollection(COLLECTIONS.students);
      setConfirmOpen(false);
      toast.success(
        `${promoted.length} student${promoted.length === 1 ? "" : "s"} promoted to ${targetYear}.`,
      );
    } catch (error) {
      toast.error(error.message || "Could not promote students.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="mt-6 border-t border-border pt-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Promote students</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Students are assigned to the next configured class automatically, keeping their section
            when available. The final class is not promoted; review and adjust other assignments
            before confirming. Previous-year records remain unchanged.
          </p>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            Source year
            <Select value={sourceYear} onValueChange={setSourceYear}>
              <SelectTrigger>
                <SelectValue placeholder="Choose source year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.id} value={year.name}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1.5 text-sm">
            Target year
            <Select value={targetYear} onValueChange={setTargetYear}>
              <SelectTrigger>
                <SelectValue placeholder="Choose target year" />
              </SelectTrigger>
              <SelectContent>
                {years
                  .filter((year) => year.name !== sourceYear && !year.closed)
                  .map((year) => (
                    <SelectItem key={year.id} value={year.name}>
                      {year.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </label>
        </div>
        {!sourceStudents.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No students are enrolled in the selected source year.
          </p>
        ) : !targetYear ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add another academic year before promoting students.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Promote</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Current class</TableHead>
                    <TableHead>Next class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Fee structures</TableHead>
                    <TableHead>Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceStudents.map((student) => {
                    const choice = choices[student.id] ?? {};
                    const sourceClassIndex = orderedClasses.findIndex(
                      (item) => item.name === student.className,
                    );
                    const isFinalClass =
                      choice.isFinalClass ??
                      (sourceClassIndex === orderedClasses.length - 1 && sourceClassIndex >= 0);
                    const targetClass = classes.find((item) => item.name === choice.className);
                    const sections = classSections(targetClass);
                    const availableStructures = structures.filter(
                      (item) =>
                        item.academicYear === targetYear &&
                        item.className === choice.className &&
                        item.active,
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={choice.selected ?? false}
                            disabled={isFinalClass}
                            onCheckedChange={(checked) =>
                              updateChoice(student.id, { selected: Boolean(checked) })
                            }
                            aria-label={`Promote ${student.firstName} ${student.lastName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell>
                          {student.className} · {student.section}
                        </TableCell>
                        <TableCell>
                          {isFinalClass ? (
                            <span className="text-sm text-muted-foreground">Final class</span>
                          ) : (
                            <Select
                              value={choice.className ?? ""}
                              onValueChange={(value) => changeClass(student.id, value)}
                            >
                              <SelectTrigger aria-label={`Next class for ${student.firstName}`}>
                                <SelectValue placeholder="Assign class" />
                              </SelectTrigger>
                              <SelectContent>
                                {classes.map((item) => (
                                  <SelectItem key={item.id} value={item.name}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isFinalClass ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : (
                            <Select
                              value={choice.section || undefined}
                              onValueChange={(section) => updateChoice(student.id, { section })}
                              disabled={!sections.length}
                            >
                              <SelectTrigger aria-label={`Next section for ${student.firstName}`}>
                                <SelectValue placeholder="Section" />
                              </SelectTrigger>
                              <SelectContent>
                                {sections.map((section) => (
                                  <SelectItem key={section} value={section}>
                                    {section}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {isFinalClass ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : (
                            <div className="space-y-2">
                              {availableStructures.map((structure) => {
                                const selectedIds = choice.structureIds?.length
                                  ? choice.structureIds
                                  : choice.structureId
                                    ? [choice.structureId]
                                    : [];
                                return (
                                  <label
                                    key={structure.id}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    <Checkbox
                                      checked={selectedIds.includes(structure.id)}
                                      onCheckedChange={(checked) => {
                                        const structureIds = checked
                                          ? [...selectedIds, structure.id]
                                          : selectedIds.filter((id) => id !== structure.id);
                                        updateChoice(student.id, {
                                          structureIds,
                                          structureId: structureIds[0] ?? "",
                                        });
                                      }}
                                    />
                                    {structure.name}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            disabled={isFinalClass}
                            aria-label={`Discount for ${student.firstName}`}
                            value={choice.discount ?? 0}
                            onChange={(event) =>
                              updateChoice(student.id, { discount: Number(event.target.value) })
                            }
                            className="w-28"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {selected.length} selected · Unselected students are not changed.
              </p>
              <Button onClick={() => setConfirmOpen(true)} disabled={!selected.length || saving}>
                Review promotion
              </Button>
            </div>
          </>
        )}
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm student promotion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create {selected.length} new enrollment{selected.length === 1 ? "" : "s"} for{" "}
            {targetYear}? Existing enrollments and payments for {sourceYear} will be retained.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={promote} disabled={saving}>
              {saving ? "Promoting…" : "Confirm promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
