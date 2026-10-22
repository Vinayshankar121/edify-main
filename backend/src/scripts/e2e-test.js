import assert from "node:assert/strict";
import { pool } from "../db.js";

const baseUrl = process.env.API_BASE_URL || "http://localhost:4000/api";
const username = process.env.TEST_ADMIN_USERNAME;
const password = process.env.TEST_ADMIN_PASSWORD;
if (!username || !password) {
  throw new Error("Set TEST_ADMIN_USERNAME and TEST_ADMIN_PASSWORD to an existing test admin account.");
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const admissionNo = `E2E-${suffix}`;
const studentCode = `E2E-STU-${suffix}`;
const className = `ZZZ E2E Progress ${suffix}`;
const finalClassName = `ZZZZ E2E Final ${suffix}`;
const cashierUsername = `e2e-cashier-${suffix}`;
const cashierEmployeeId = `E2E-EMP-${suffix}`;
const structureIds = [];
let token;
let targetYearName;

async function request(
  path,
  { method = "GET", body, expectedStatus = 200, token: requestToken = token } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expectedStatus, `${method} ${path}: ${JSON.stringify(payload)}`);
  return payload;
}

try {
  token = (
    await request("/auth/login", {
      method: "POST",
      body: { username, password },
    })
  ).token;
  let years = await request("/academic-years");
  if (!years.length) {
    await request("/academic-years", { method: "POST", expectedStatus: 201, body: { name: "2026-2027", active: true } });
    years = await request("/academic-years");
  }
  const year = years.find((item) => item.active) ?? years[0];
  assert.ok(year, "An academic year is required for the E2E test.");
  const nextYearStart = Math.max(...years.map((item) => Number(item.name.slice(0, 4)))) + 1;
  targetYearName = `${nextYearStart}-${nextYearStart + 1}`;

  await request("/classes", {
    method: "POST",
    expectedStatus: 201,
    body: { name: className, sections: ["A"] },
  });
  await request("/fee-structures", {
    method: "POST",
    expectedStatus: 400,
    body: {
      name: `Negative Fee ${suffix}`,
      className,
      academicYear: year.name,
      active: true,
      heads: [{ name: "Tuition", amount: -1 }],
    },
  });
  await request("/fee-structures", {
    method: "POST",
    expectedStatus: 400,
    body: {
      name: `Zero Fee ${suffix}`,
      className,
      academicYear: year.name,
      active: true,
      heads: [{ name: "Tuition", amount: 0 }],
    },
  });
  await request("/classes", {
    method: "POST",
    expectedStatus: 201,
    body: { name: finalClassName, sections: ["A"] },
  });
  for (const [name, amount] of [["Structure One", 1000], ["Structure Two", 1200]]) {
    const structure = await request("/fee-structures", {
      method: "POST",
      expectedStatus: 201,
      body: {
        name: `${name} ${suffix}`,
        className,
        academicYear: year.name,
        active: true,
        heads: [{ name: "Tuition", amount }],
      },
    });
    structureIds.push(structure.id);
  }
  const transportStructure = await request("/fee-structures", {
    method: "POST",
    expectedStatus: 201,
    body: {
      name: `Transport Add-on ${suffix}`,
      className,
      academicYear: year.name,
      active: true,
      heads: [{ name: "Transport", amount: 250 }],
    },
  });
  structureIds.push(transportStructure.id);
  const fetchedStructure = (await request("/fee-structures")).find(
    (structure) => structure.id === structureIds[1],
  );
  assert.equal(typeof fetchedStructure.active, "boolean");
  const revisedStructure = await request(`/fee-structures/${structureIds[1]}`, {
    method: "PATCH",
    body: {
      ...fetchedStructure,
      name: `Structure Two Revised ${suffix}`,
      heads: [{ name: "Tuition", amount: 1200 }, { name: "Activities", amount: 100 }],
    },
  });
  assert.equal(revisedStructure.heads.reduce((sum, head) => sum + head.amount, 0), 1300);
  const firstStructureTerms = `/fee-terms?structureId=${structureIds[0]}`;
  await request(firstStructureTerms, {
    method: "PUT",
    expectedStatus: 400,
    body: [{ name: "Incomplete schedule", amount: 900, dueDate: "2027-01-01" }],
  });
  const savedTerms = await request(firstStructureTerms, {
    method: "PUT",
    body: [
      { name: "Term 1", amount: 333.33, dueDate: "2027-01-01" },
      { name: "Term 2", amount: 666.67, dueDate: "2027-04-01" },
    ],
  });
  assert.equal(savedTerms.reduce((sum, term) => sum + term.amount, 0), 1000);
  const finalSourceStructure = await request("/fee-structures", {
    method: "POST",
    expectedStatus: 201,
    body: {
      name: `Final Source ${suffix}`,
      className: finalClassName,
      academicYear: year.name,
      active: true,
      heads: [{ name: "Tuition", amount: 1200 }],
    },
  });
  structureIds.push(finalSourceStructure.id);
  await request("/academic-years", {
    method: "POST",
    expectedStatus: 201,
    body: { name: targetYearName, active: false },
  });
  const targetStructure = await request("/fee-structures", {
    method: "POST",
    expectedStatus: 201,
    body: {
      name: `Next Year Final ${suffix}`,
      className: finalClassName,
      academicYear: targetYearName,
      active: true,
      heads: [{ name: "Tuition", amount: 1200 }],
    },
  });
  structureIds.push(targetStructure.id);

  const date = new Date().toISOString().slice(0, 10);
  const admission = {
    admissionNo,
    studentId: studentCode,
    firstName: "End To End",
    lastName: "Student",
    dob: "2010-01-01",
    gender: "Male",
    admissionDate: date,
    academicYear: year.name,
    className,
    section: "A",
    structureId: structureIds[0],
    discount: 100,
    initialPayment: 200,
    paymentMode: "UPI",
    initialPaymentReference: `ADM-${suffix}`,
  };
  await request("/students", {
    method: "POST",
    expectedStatus: 400,
    body: { ...admission, dob: "2999-01-01" },
  });
  await request("/students", {
    method: "POST",
    expectedStatus: 400,
    body: { ...admission, admissionDate: "2999-01-01" },
  });
  await request("/students", {
    method: "POST",
    expectedStatus: 400,
    body: { ...admission, discount: -1 },
  });
  await request("/students", {
    method: "POST",
    expectedStatus: 400,
    body: { ...admission, discount: 2000, initialPayment: 0 },
  });
  await request("/students", {
    method: "POST",
    expectedStatus: 400,
    body: { ...admission, initialPaymentReference: "" },
  });

  const student = await request("/students", {
    method: "POST",
    expectedStatus: 201,
    body: admission,
  });
  const otherStudent = await request("/students", {
    method: "POST",
    expectedStatus: 201,
    body: {
      ...admission,
      admissionNo: `${admissionNo}-OTHER`,
      studentId: `${studentCode}-OTHER`,
      initialPayment: 0,
    },
  });
  const studentWithTransport = await request(`/students/${student.id}`, {
    method: "PATCH",
    body: {
      structureIds: [structureIds[0], transportStructure.id],
    },
  });
  assert.deepEqual(new Set(studentWithTransport.structureIds), new Set([structureIds[0], transportStructure.id]));
  await request(`/fee-structures/${structureIds[0]}`, {
    method: "DELETE",
    expectedStatus: 409,
  });
  const feeAfterDeleteAttempt = await request(`/students/${student.id}`);
  assert.deepEqual(feeAfterDeleteAttempt.feeSummary, { payable: 1150, paid: 200, balance: 950 });
  const feeForOtherStudent = await request(`/students/${otherStudent.id}`);
  assert.deepEqual(feeForOtherStudent.feeSummary, { payable: 900, paid: 0, balance: 900 });
  const finalStudent = await request("/students", {
    method: "POST",
    expectedStatus: 201,
    body: {
      ...admission,
      admissionNo: `${admissionNo}-FINAL`,
      studentId: `${studentCode}-FINAL`,
      className: finalClassName,
      structureId: finalSourceStructure.id,
      initialPayment: 0,
    },
  });
  const updated = await request(`/students/${student.id}`, {
    method: "PATCH",
    body: {
      studentId: `${studentCode}-UPDATED`,
      firstName: "Updated E2E",
      structureId: structureIds[1],
      discount: 100,
    },
  });
  assert.equal(updated.studentId, `${studentCode}-UPDATED`);
  assert.equal(updated.firstName, "Updated E2E");
  assert.equal(updated.structureId, structureIds[1]);
  const persistedUpdate = await request(`/students/${student.id}`);
  assert.equal(persistedUpdate.studentId, `${studentCode}-UPDATED`);
  assert.equal(persistedUpdate.firstName, "Updated E2E");
  const promoted = await request("/promotions", {
    method: "POST",
    expectedStatus: 201,
    body: {
      sourceAcademicYear: year.name,
      targetAcademicYear: targetYearName,
      students: [
        {
          enrollmentId: student.id,
          className: finalClassName,
          section: "A",
          structureId: targetStructure.id,
          discount: 100,
        },
      ],
    },
  });
  assert.equal(promoted.length, 1);
  await request("/promotions", {
    method: "POST",
    expectedStatus: 409,
    body: {
      sourceAcademicYear: year.name,
      targetAcademicYear: targetYearName,
      students: [
        {
          enrollmentId: finalStudent.id,
          className: finalClassName,
          section: "A",
          structureId: targetStructure.id,
          discount: 0,
        },
      ],
    },
  });

  await request("/cashiers", {
    method: "POST",
    expectedStatus: 201,
    body: {
      name: `E2E Cashier ${suffix}`,
      employeeId: cashierEmployeeId,
      email: `e2e-${suffix}@example.test`,
      phone: "1234567890",
      username: cashierUsername,
      password: `E2eCashier!${suffix}`,
      status: "active",
    },
  });
  const cashierToken = (
    await request("/auth/login", {
      method: "POST",
      body: { username: cashierUsername, password: `E2eCashier!${suffix}` },
      token: null,
    })
  ).token;
  await request("/cashiers", { expectedStatus: 403, token: cashierToken });
  await request("/active-year", {
    method: "PUT",
    expectedStatus: 403,
    body: { activeYear: year.name },
    token: cashierToken,
  });
  await request("/students", { token: cashierToken });
  await request("/classes", {
    method: "POST",
    expectedStatus: 403,
    body: { name: `Cashier Must Not Create ${suffix}`, sections: ["A"] },
    token: cashierToken,
  });
  await request("/fee-structures", {
    method: "POST",
    expectedStatus: 403,
    body: {
      name: `Cashier Must Not Create ${suffix}`,
      className,
      academicYear: year.name,
      heads: [{ name: "Tuition", amount: 1 }],
    },
    token: cashierToken,
  });
  await request("/students", {
    method: "POST",
    expectedStatus: 403,
    body: admission,
    token: cashierToken,
  });
  await request("/settings", {
    method: "PATCH",
    expectedStatus: 403,
    body: { schoolName: "Cashier Must Not Change Settings" },
    token: cashierToken,
  });

  await request("/payments", {
    method: "POST",
    expectedStatus: 400,
    body: {
      studentId: student.id,
      amount: 100,
      mode: "UPI",
      academicYear: year.name,
      reference: "",
    },
    token: cashierToken,
  });
  await request("/payments", {
    method: "POST",
    expectedStatus: 400,
    body: {
      studentId: student.id,
      amount: -100,
      mode: "Cash",
      academicYear: year.name,
    },
    token: cashierToken,
  });
  await request("/payments", {
    method: "POST",
    expectedStatus: 400,
    body: {
      studentId: student.id,
      amount: 0,
      mode: "Cash",
      academicYear: year.name,
    },
    token: cashierToken,
  });
  await request("/payments", {
    method: "POST",
    expectedStatus: 400,
    body: {
      studentId: student.id,
      amount: 101,
      mode: "Cash",
      academicYear: year.name,
      feeHeads: [{ structureId: structureIds[1], position: 1 }],
    },
    token: cashierToken,
  });
  const payment = await request("/payments", {
    method: "POST",
    expectedStatus: 201,
    body: {
      studentId: student.id,
      amount: 100,
      mode: "UPI",
      academicYear: year.name,
      reference: `PAY-${suffix}`,
      feeHeads: [{ structureId: structureIds[1], position: 1 }],
    },
    token: cashierToken,
  });
  assert.ok(payment.receiptNo, "Successful payments must receive a receipt number.");
  assert.deepEqual(payment.feeHeads, [
    {
      structureId: structureIds[1],
      position: 1,
      headName: "Activities",
      amount: 100,
    },
  ]);
  const listedPayment = (await request(`/payments?studentId=${student.id}`)).find(
    (item) => item.id === payment.id,
  );
  assert.equal(listedPayment.feeHeads[0].headName, "Activities");

  const detail = await request(`/students/${student.id}`);
  assert.deepEqual(detail.feeSummary, { payable: 1200, paid: 300, balance: 900 });
  const report = await request(
    `/reports/fee-summary?academicYear=${encodeURIComponent(year.name)}`,
  );
  const reportRow = report.find((row) => row.studentId === student.id);
  assert.ok(reportRow, "The enrolled student must appear in the fee summary report.");
  assert.equal(reportRow.paid, 300);
  assert.equal(reportRow.balance, 900);

  const archived = await request(`/students/${student.id}/archive`, {
    method: "PATCH",
    body: { reason: "E2E archive retention check" },
  });
  assert.equal(archived.archived, true);
  const activeStudents = await request(`/students?academicYear=${encodeURIComponent(year.name)}`);
  assert.equal(activeStudents.some((item) => item.id === student.id), false);
  await request("/payments", {
    method: "POST",
    expectedStatus: 409,
    body: { studentId: student.id, amount: 1, mode: "Cash", academicYear: year.name },
    token: cashierToken,
  });
  const restored = await request(`/students/${student.id}/restore`, { method: "PATCH" });
  assert.equal(restored.archived, false);

  console.log(
    "E2E passed: admin and cashier workflows, role restrictions, and negative validation for future dates, negative/zero fees, discounts, and payments.",
  );
} finally {
  await pool.query("DELETE FROM payments WHERE student_admission_no = $1", [admissionNo]);
  await pool.query("DELETE FROM payments WHERE student_admission_no = $1", [`${admissionNo}-OTHER`]);
  await pool.query("DELETE FROM payments WHERE student_admission_no = $1", [`${admissionNo}-FINAL`]);
  await pool.query("DELETE FROM students WHERE admission_no = $1", [admissionNo]);
  await pool.query("DELETE FROM students WHERE admission_no = $1", [`${admissionNo}-OTHER`]);
  await pool.query("DELETE FROM students WHERE admission_no = $1", [`${admissionNo}-FINAL`]);
  await pool.query("DELETE FROM cashiers WHERE employee_id = $1", [cashierEmployeeId]);
  await pool.query("DELETE FROM users WHERE username = $1", [cashierUsername]);
  if (structureIds.length) {
    for (const structureId of structureIds) {
      await pool.query("DELETE FROM fee_structures WHERE id = $1", [structureId]);
    }
  }
  await pool.query("DELETE FROM school_classes WHERE name = $1", [className]);
  await pool.query("DELETE FROM school_classes WHERE name = $1", [finalClassName]);
  if (targetYearName) {
    await pool.query("DELETE FROM academic_years WHERE name = $1", [targetYearName]);
  }
  await pool.end();
}
