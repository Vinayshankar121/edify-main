import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { studentFeeTotal } from "@/lib/fees";

const MAX_ROWS = 250;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const fields = [
  ["Admission No", "admissionNo"],
  ["Student ID", "studentId"],
  ["First Name", "firstName"],
  ["Last Name", "lastName"],
  ["Date of Birth", "dob"],
  ["Gender", "gender"],
  ["Blood Group", "bloodGroup"],
  ["Aadhaar", "aadhaar"],
  ["Admission Date", "admissionDate"],
  ["Father Name", "fatherName"],
  ["Father Phone", "fatherPhone"],
  ["Father Email", "fatherEmail"],
  ["Mother Name", "motherName"],
  ["Mother Phone", "motherPhone"],
  ["Mother Email", "motherEmail"],
  ["Guardian Name", "guardianName"],
  ["Guardian Relation", "guardianRelation"],
  ["Guardian Phone", "guardianPhone"],
  ["Address", "address"],
  ["Academic Year", "academicYear"],
  ["Class", "className"],
  ["Section", "section"],
  ["Roll Number", "rollNo"],
  ["Previous Class", "previousClass"],
  ["Previous School", "previousSchool"],
  ["Fee Category", "feeCategory"],
  ["Fee Structure", "feeStructure"],
  ["Discount", "discount"],
  ["Initial Payment", "initialPayment"],
  ["Payment Mode", "paymentMode"],
  ["Payment Reference", "initialPaymentReference"],
];
const textFields = new Set([
  "admissionNo",
  "studentId",
  "firstName",
  "lastName",
  "gender",
  "bloodGroup",
  "aadhaar",
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
  "academicYear",
  "className",
  "section",
  "rollNo",
  "previousClass",
  "previousSchool",
  "feeCategory",
  "feeStructure",
  "paymentMode",
  "initialPaymentReference",
]);
const validGenders = ["Male", "Female", "Other"];
const validPaymentModes = ["Cash", "UPI", "Card", "Bank Transfer"];
const phoneOk = (value) => !value || /^[6-9]\d{9}$/.test(value);
const emailOk = (value) => !value || /^\S+@\S+\.\S+$/.test(value);

function valueOf(cell) {
  const value = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value)
      throw new Error("Formula cells are not supported");
    if (Array.isArray(value.richText))
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    return String(value.text ?? value.result ?? "").trim();
  }
  return value;
}

function dateValue(value, ExcelJS) {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return Number.isNaN(date.valueOf()) ? "" : date.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text ? "" : text;
}

function numericValue(value, label, errors) {
  if (value === "" || value == null) return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    errors.push(`${label} must be a non-negative number`);
    return 0;
  }
  return number;
}

function normalizedKey(value) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase();
}

function validateRow(
  raw,
  rowNumber,
  { ExcelJS, students, classes, structures, years, seenAdmission, seenStudent },
) {
  const errors = [];
  const data = Object.fromEntries(fields.map(([, key]) => [key, raw[key] ?? ""]));
  for (const key of textFields) data[key] = String(data[key] ?? "").trim();
  data.dob = dateValue(data.dob, ExcelJS);
  data.admissionDate = dateValue(data.admissionDate, ExcelJS);

  for (const key of [
    "admissionNo",
    "studentId",
    "firstName",
    "lastName",
    "dob",
    "admissionDate",
    "gender",
    "academicYear",
    "className",
    "section",
    "feeStructure",
  ]) {
    if (!data[key])
      errors.push(`${fields.find(([, field]) => field === key)?.[0] ?? key} is required`);
  }
  if (!validGenders.some((gender) => normalizedKey(gender) === normalizedKey(data.gender))) {
    errors.push("Gender must be Male, Female, or Other");
  } else {
    data.gender = validGenders.find(
      (gender) => normalizedKey(gender) === normalizedKey(data.gender),
    );
  }
  if (data.aadhaar && !/^\d{12}$/.test(data.aadhaar.replace(/\s/g, ""))) {
    errors.push("Aadhaar must contain 12 digits");
  }
  data.aadhaar = data.aadhaar.replace(/\s/g, "");
  for (const key of ["fatherPhone", "motherPhone", "guardianPhone"]) {
    if (!phoneOk(data[key]))
      errors.push(
        `${fields.find(([, field]) => field === key)[0]} must be a valid 10-digit mobile`,
      );
  }
  if (!data.fatherName && !data.guardianName)
    errors.push("Father Name or Guardian Name is required");
  if (!data.fatherPhone && !data.guardianPhone)
    errors.push("Father Phone or Guardian Phone is required");
  for (const key of ["fatherEmail", "motherEmail"]) {
    if (!emailOk(data[key]))
      errors.push(`${fields.find(([, field]) => field === key)[0]} is not a valid email`);
  }
  if (!data.address) errors.push("Address is required");

  const existingAdmission = students.find(
    (student) => normalizedKey(student.admissionNo) === normalizedKey(data.admissionNo),
  );
  if (existingAdmission || seenAdmission.has(normalizedKey(data.admissionNo)))
    errors.push("Admission No is already in use");
  const existingStudent = students.find(
    (student) => normalizedKey(student.studentId) === normalizedKey(data.studentId),
  );
  if (existingStudent || seenStudent.has(normalizedKey(data.studentId)))
    errors.push("Student ID is already in use");
  if (data.admissionNo) seenAdmission.add(normalizedKey(data.admissionNo));
  if (data.studentId) seenStudent.add(normalizedKey(data.studentId));

  const year = years.find((item) => item.name === data.academicYear);
  if (!year) errors.push("Academic Year does not exist");
  else if (year.closed) errors.push("Academic Year is closed");
  const classRecord = classes.find(
    (item) => normalizedKey(item.name) === normalizedKey(data.className),
  );
  if (!classRecord) errors.push("Class does not exist");
  else data.className = classRecord.name;
  if (classRecord) {
    const section = classRecord.sections.find(
      (item) => normalizedKey(item) === normalizedKey(data.section),
    );
    if (!section) errors.push("Section does not exist for this class");
    else data.section = section;
  }

  const feeStructure = structures.find(
    (item) =>
      item.active &&
      item.academicYear === data.academicYear &&
      normalizedKey(item.className) === normalizedKey(data.className) &&
      normalizedKey(item.name) === normalizedKey(data.feeStructure),
  );
  if (!feeStructure)
    errors.push("Active Fee Structure was not found for the selected year and class");
  data.discount = numericValue(data.discount, "Discount", errors);
  data.initialPayment = numericValue(data.initialPayment, "Initial Payment", errors);
  const feeTotal = studentFeeTotal(feeStructure);
  if (feeStructure && data.discount > feeTotal)
    errors.push("Discount exceeds the fee structure total");
  if (feeStructure && data.initialPayment > Math.max(feeTotal - data.discount, 0)) {
    errors.push("Initial Payment exceeds the payable fee");
  }
  data.feeCategory ||= "General";
  data.paymentMode ||= "Cash";
  if (!validPaymentModes.includes(data.paymentMode))
    errors.push("Payment Mode must be Cash, UPI, Card, or Bank Transfer");
  data.initialPaymentReference = String(data.initialPaymentReference ?? "").trim();
  if (data.initialPayment > 0 && data.paymentMode !== "Cash" && !data.initialPaymentReference) {
    errors.push("Payment Reference is required for non-cash payments");
  }

  const { feeStructure: _feeStructure, ...payload } = data;
  payload.structureId = feeStructure?.id ?? "";
  return { rowNumber, payload, errors, status: errors.length ? "Invalid" : "Ready" };
}

async function downloadTemplate() {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NR Edify English Medium School";
  const sheet = workbook.addWorksheet("Admissions");
  sheet.columns = fields.map(([header, key]) => ({
    header,
    key,
    width: Math.max(header.length + 3, 18),
  }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${sheet.getColumn(fields.length).letter}1` };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2F70" } };
  sheet.getColumn(fields.findIndex(([, key]) => key === "dob") + 1).numFmt = "yyyy-mm-dd";
  sheet.getColumn(fields.findIndex(([, key]) => key === "admissionDate") + 1).numFmt = "yyyy-mm-dd";

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ width: 28 }, { width: 100 }];
  instructions.addRows([
    ["NR Edify English Medium School", "Bulk admissions template"],
    [
      "Required",
      "Admission No, Student ID, First Name, Last Name, Date of Birth, Gender, Admission Date, Father or Guardian Name, Father or Guardian Phone, Address, Academic Year, Class, Section, and Fee Structure.",
    ],
    ["Dates", "Enter dates as YYYY-MM-DD. Excel date cells are also supported."],
    [
      "Class and fees",
      "Use the exact configured Academic Year, Class, Section, and active Fee Structure name. The fee structure must match the selected year and class.",
    ],
    ["Allowed Gender", "Male, Female, Other"],
    ["Allowed Payment Mode", "Cash, UPI, Card, Bank Transfer"],
    [
      "Payment",
      "Initial Payment and Discount are optional and default to 0. Non-cash initial payments require a Payment Reference.",
    ],
    [
      "Unique IDs",
      "Admission No and Student ID must be unique. Format phone and Aadhaar columns as Text if leading zeroes must be preserved.",
    ],
    [
      "Upload",
      "Keep the Admissions sheet and its header row. Review and resolve all row errors before creating admissions.",
    ],
  ]);
  instructions.getRow(1).font = { bold: true, size: 14, color: { argb: "FF0B2F70" } };
  instructions.getColumn(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "nr-edify-bulk-admissions-template.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadWithFeedback() {
  try {
    await downloadTemplate();
    toast.success("Admission template downloaded.");
  } catch (error) {
    toast.error(error.message || "Could not download the admission template.");
  }
}

export function BulkAdmissionActions({ students, classes, structures, years, onCreated }) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFileName("");
    setRows([]);
    setFileError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const previewFile = async (file) => {
    reset();
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setFileError("Choose an .xlsx workbook.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("The workbook must be 5 MB or smaller.");
      return;
    }
    setFileName(file.name);
    setReading(true);
    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.getWorksheet("Admissions");
      if (!sheet) throw new Error('The workbook must contain a sheet named "Admissions".');
      const headerRow = sheet.getRow(1);
      const headers = headerRow.values.slice(1).map((value) => String(value ?? "").trim());
      const requiredHeaders = fields.map(([header]) => header);
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) throw new Error(`Missing columns: ${missingHeaders.join(", ")}`);

      const sourceRows = [];
      for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const raw = {};
        let hasValue = false;
        for (const [header, key] of fields) {
          const column = headers.indexOf(header) + 1;
          const value = valueOf(row.getCell(column));
          raw[key] = value;
          if (value !== "") hasValue = true;
        }
        if (hasValue) sourceRows.push({ row, raw, rowNumber });
      }
      if (!sourceRows.length) throw new Error("The Admissions sheet has no student rows.");
      if (sourceRows.length > MAX_ROWS)
        throw new Error(`Upload no more than ${MAX_ROWS} student rows at a time.`);

      const seenAdmission = new Set();
      const seenStudent = new Set();
      const parsed = sourceRows.map(({ raw, rowNumber }) =>
        validateRow(raw, rowNumber, {
          ExcelJS,
          students,
          classes,
          structures,
          years,
          seenAdmission,
          seenStudent,
        }),
      );
      setRows(parsed);
    } catch (error) {
      setFileError(error.message || "Could not read this Excel workbook.");
    } finally {
      setReading(false);
    }
  };

  const upload = async () => {
    if (!rows.length || rows.some((row) => row.errors.length)) return;
    setUploading(true);
    const completed = [];
    let hasPayments = false;
    for (const row of rows) {
      try {
        const created = await apiRequest("/students", { method: "POST", body: row.payload });
        completed.push({ ...row, status: "Created", errors: [], createdId: created.id });
        hasPayments ||= Boolean(created.payment);
      } catch (error) {
        completed.push({
          ...row,
          status: "Failed",
          errors: [error.message || "Could not create admission"],
        });
      }
    }
    const succeeded = completed.filter((row) => row.status === "Created").length;
    const failed = completed.length - succeeded;
    setRows(completed);
    setResult({ succeeded, failed });
    if (succeeded) await onCreated({ hasPayments });
    if (failed)
      toast.error(`${failed} admission${failed === 1 ? "" : "s"} failed. See row details.`);
    else toast.success(`${succeeded} admission${succeeded === 1 ? "" : "s"} created.`);
    setUploading(false);
  };

  const invalidCount = rows.filter((row) => row.errors.length).length;
  const readyCount = rows.length - invalidCount;
  return (
    <>
      <Button variant="outline" onClick={() => void downloadWithFeedback()}>
        <Download className="mr-2 size-4" /> Excel template
      </Button>
      <Button onClick={() => setOpen(true)}>
        <Upload className="mr-2 size-4" /> Bulk upload
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (uploading) return;
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk student admissions</DialogTitle>
            <DialogDescription>
              Download the template, fill one student per row, then review every row before creating
              admissions.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => void downloadWithFeedback()}>
              <Download className="mr-2 size-4" /> Download template
            </Button>
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              disabled={reading || uploading}
            >
              <FileSpreadsheet className="mr-2 size-4" /> Choose .xlsx file
            </Button>
            <Input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => void previewFile(event.target.files?.[0])}
            />
            {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            {reading && <span className="text-sm text-muted-foreground">Reading workbook...</span>}
          </div>
          {fileError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {fileError}
            </p>
          )}
          {rows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm">
                {result
                  ? `${result.succeeded} created · ${result.failed} failed`
                  : `${readyCount} ready · ${invalidCount} with errors`}
                {!result && " · Maximum 250 rows per upload"}
              </p>
              <div className="max-h-[45vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status / issue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {`${row.payload.firstName} ${row.payload.lastName}`.trim()}
                        </TableCell>
                        <TableCell>{row.payload.admissionNo}</TableCell>
                        <TableCell>
                          {row.payload.className} {row.payload.section}
                        </TableCell>
                        <TableCell
                          className={
                            row.errors.length ? "text-destructive" : "text-muted-foreground"
                          }
                        >
                          {row.errors.length ? row.errors.join("; ") : row.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              Close
            </Button>
            <Button
              onClick={() => void upload()}
              disabled={!rows.length || invalidCount > 0 || uploading || Boolean(result)}
            >
              {uploading ? "Creating admissions..." : `Create ${readyCount} admissions`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
