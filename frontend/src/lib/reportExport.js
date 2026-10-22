import { feeSummary } from "@/lib/fees";

const moneyColumns = new Set(["Amount", "Fee Total", "Discount", "Payable", "Paid", "Balance"]);

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2F70" } };
  row.alignment = { vertical: "middle" };
}

function addDataTable(sheet, columns, rows, startRow = 1) {
  const header = sheet.getRow(startRow);
  columns.forEach((column, index) => {
    header.getCell(index + 1).value = column;
    sheet.getColumn(index + 1).width = Math.min(Math.max(column.length + 3, 14), 32);
  });
  styleHeader(header);
  for (const [index, record] of rows.entries()) {
    const row = sheet.getRow(startRow + index + 1);
    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.value = record[column] ?? "";
      if (moneyColumns.has(column) && typeof cell.value === "number") {
        cell.numFmt = "#,##0.00;[Red]-#,##0.00";
      }
    });
  }
  sheet.views = [{ state: "frozen", ySplit: startRow }];
  if (columns.length && rows.length) {
    sheet.autoFilter = {
      from: { row: startRow, column: 1 },
      to: { row: startRow + rows.length, column: columns.length },
    };
  }
}

export async function createReportWorkbook({
  report,
  academicYear,
  columns,
  rows,
  detailColumns,
  details,
  filters,
  totals,
}) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NR Edify English Medium School";
  workbook.subject = `${report} for academic year ${academicYear}`;

  const summary = workbook.addWorksheet("Summary");
  summary.addRow(["NR Edify English Medium School"]);
  summary.getRow(1).font = { bold: true, size: 16, color: { argb: "FF0B2F70" } };
  summary.addRow(["Report", report]);
  summary.addRow(["Academic Year", academicYear]);
  summary.addRow([
    "Filters",
    Object.entries(filters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | "),
  ]);
  summary.addRow([
    "Transactions",
    totals.transactions,
    "Students",
    totals.students,
    "Collected",
    totals.collected,
    "Pending",
    totals.pending,
  ]);
  addDataTable(summary, columns, rows, 7);
  summary.getColumn(1).width = Math.max(summary.getColumn(1).width, 22);

  const detailSheet = workbook.addWorksheet("Details");
  detailSheet.addRow([`${report} - complete detail`]);
  detailSheet.getRow(1).font = { bold: true, size: 14, color: { argb: "FF0B2F70" } };
  detailSheet.addRow(["Academic Year", academicYear]);
  detailSheet.addRow([
    "Filters",
    Object.entries(filters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | "),
  ]);
  addDataTable(detailSheet, detailColumns, details, 5);

  return workbook.xlsx.writeBuffer();
}

export async function downloadReportWorkbook(options) {
  const buffer = await createReportWorkbook(options);
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${academicYear}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadStudentWorkbook({ academicYear, students, structures, payments }) {
  const [{ default: ExcelJS }, { default: JSZip }] = await Promise.all([
    import("exceljs"),
    import("jszip"),
  ]);
  const archive = new JSZip();

  const columns = [
    ["Admission No", (student) => student.admissionNo],
    ["Student ID", (student) => student.studentId],
    ["First Name", (student) => student.firstName],
    ["Last Name", (student) => student.lastName],
    ["Date of Birth", (student) => student.dob],
    ["Gender", (student) => student.gender],
    ["Blood Group", (student) => student.bloodGroup],
    ["Aadhaar / ID", (student) => student.aadhaar],
    ["Admission Date", (student) => student.admissionDate],
    ["Academic Year", (student) => student.academicYear],
    ["Class", (student) => student.className],
    ["Section", (student) => student.section],
    ["Roll Number", (student) => student.rollNo],
    ["Previous Class", (student) => student.previousClass],
    ["Previous School", (student) => student.previousSchool],
    ["Fee Category", (student) => student.feeCategory],
    [
      "Fee Structures",
      (student) => {
        const ids = student.structureIds?.length
          ? student.structureIds
          : student.structureId
            ? [student.structureId]
            : [];
        return structures
          .filter((structure) => ids.includes(structure.id))
          .map((structure) => structure.name)
          .join(", ");
      },
    ],
    ["Fee Total", (student) => student.feeSummary.total],
    ["Discount", (student) => student.discount],
    ["Payable", (student) => student.feeSummary.payable],
    ["Paid", (student) => student.feeSummary.paid],
    ["Balance", (student) => student.feeSummary.balance],
    ["Fee Status", (student) => student.feeSummary.status],
    ["Father Name", (student) => student.fatherName],
    ["Father Phone", (student) => student.fatherPhone],
    ["Father Email", (student) => student.fatherEmail],
    ["Mother Name", (student) => student.motherName],
    ["Mother Phone", (student) => student.motherPhone],
    ["Mother Email", (student) => student.motherEmail],
    ["Guardian Name", (student) => student.guardianName],
    ["Guardian Relation", (student) => student.guardianRelation],
    ["Guardian Phone", (student) => student.guardianPhone],
    ["Address", (student) => student.address],
  ];
  const orderedStudents = students
    .filter((student) => student.academicYear === academicYear && !student.archived)
    .map((student) => ({
      ...student,
      feeSummary: feeSummary(student, structures, payments),
    }))
    .sort(
      (left, right) =>
        left.className.localeCompare(right.className, undefined, { numeric: true }) ||
        left.section.localeCompare(right.section) ||
        left.rollNo.localeCompare(right.rollNo, undefined, { numeric: true }) ||
        left.admissionNo.localeCompare(right.admissionNo),
    );
  const classes = new Map();
  for (const student of orderedStudents) {
    const classStudents = classes.get(student.className) ?? [];
    classStudents.push(student);
    classes.set(student.className, classStudents);
  }

  const usedFileNames = new Set();
  for (const [className, classStudents] of classes) {
    const baseName =
      (className || "Class")
        .replace(/[<>:"/\\|?*]/g, "-")
        .trim()
        .replace(/[. ]+$/g, "")
        .slice(0, 80) || "Class";
    let fileName = `${baseName}-${academicYear}.xlsx`;
    let suffix = 2;
    while (usedFileNames.has(fileName.toLowerCase())) {
      fileName = `${baseName.slice(0, 75)}-${suffix}-${academicYear}.xlsx`;
      suffix += 1;
    }
    usedFileNames.add(fileName.toLowerCase());
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NR Edify English Medium School";
    workbook.subject = `${className} student details for academic year ${academicYear}`;
    const sheet = workbook.addWorksheet("Students");
    const header = sheet.addRow(columns.map(([label]) => label));
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2F70" } };
    header.alignment = { vertical: "middle" };
    columns.forEach(([label], index) => {
      sheet.getColumn(index + 1).width = Math.min(Math.max(label.length + 3, 15), 34);
    });
    for (const student of classStudents) {
      const row = sheet.addRow(columns.map(([, value]) => value(student) ?? ""));
      for (const columnName of ["Fee Total", "Discount", "Payable", "Paid", "Balance"]) {
        const columnIndex = columns.findIndex(([label]) => label === columnName) + 1;
        row.getCell(columnIndex).numFmt = "#,##0.00;[Red]-#,##0.00";
      }
    }
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    if (classStudents.length) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: classStudents.length + 1, column: columns.length },
      };
    }
    archive.file(fileName, await workbook.xlsx.writeBuffer());
  }

  if (classes.size === 0) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NR Edify English Medium School";
    workbook.subject = `Student details for academic year ${academicYear}`;
    const sheet = workbook.addWorksheet("Students");
    sheet.addRow(["No active students for this academic year"]);
    archive.file(`students-${academicYear}.xlsx`, await workbook.xlsx.writeBuffer());
  }

  const buffer = await archive.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `students-by-class-${academicYear}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
