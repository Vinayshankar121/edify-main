import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool, transaction } from "../db.js";
import { HttpError, asyncHandler } from "../errors.js";
import { allowRoles, authenticate } from "../middleware/auth.js";

const router = Router();
const idSchema = z.string().uuid();
const moneySchema = z.coerce.number().positive().finite();
function localDateString(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = () => localDateString();
const pastOrTodayDateSchema = (field) => z.string().date().refine(
  (value) => value <= today(),
  `${field} cannot be in the future`,
);
const yearBody = z.object({ id: idSchema.optional(), name: z.string().trim().regex(/^\d{4}-\d{4}$/), active: z.boolean().optional(), closed: z.boolean().optional() });
const classBody = z.object({ id: idSchema.optional(), name: z.string().trim().min(1), sections: z.array(z.string().trim().min(1)).default([]) });
const headBody = z.object({
  name: z.string().trim().min(1),
  amount: moneySchema,
  optional: z.boolean().default(false),
  studentIds: z.array(idSchema).default([]),
});
const structureBody = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1),
  className: z.string().trim().min(1),
  academicYear: z.string().trim().min(1),
  active: z.boolean().default(true),
  heads: z.array(headBody).min(1),
});
const termBody = z.object({
  id: idSchema.optional(),
  structureId: idSchema,
  name: z.string().trim().min(1),
  amount: moneySchema,
  dueDate: z.string().date(),
});
const termScheduleBody = z.array(termBody.omit({ structureId: true })).min(1);
const studentFields = {
  admissionNo: "admission_no", studentId: "student_id", firstName: "first_name", lastName: "last_name",
  dob: "dob", gender: "gender", bloodGroup: "blood_group", aadhaar: "aadhaar", admissionDate: "admission_date",
  fatherName: "father_name", fatherPhone: "father_phone", fatherEmail: "father_email", motherName: "mother_name",
  motherPhone: "mother_phone", motherEmail: "mother_email", guardianName: "guardian_name",
  guardianRelation: "guardian_relation", guardianPhone: "guardian_phone", address: "address",
  className: "class_name", section: "section", rollNo: "roll_no", previousClass: "previous_class",
  previousSchool: "previous_school", feeCategory: "fee_category", structureId: "structure_id", discount: "discount",
};
const studentCoreKeys = new Set([
  "admissionNo", "studentId", "firstName", "lastName", "dob", "gender", "bloodGroup", "aadhaar",
  "admissionDate", "fatherName", "fatherPhone", "fatherEmail", "motherName", "motherPhone",
  "motherEmail", "guardianName", "guardianRelation", "guardianPhone", "address", "previousSchool",
]);
const studentEnrollmentKeys = new Set([
  "className", "section", "rollNo", "previousClass", "feeCategory", "discount",
]);
const studentBody = z.object({
  id: idSchema.optional(),
  admissionNo: z.string().trim().min(1), studentId: z.string().trim().min(1), firstName: z.string().trim().min(1),
  lastName: z.string().default(""), dob: pastOrTodayDateSchema("Date of birth"), gender: z.enum(["Male", "Female", "Other"]),
  bloodGroup: z.string().default(""), aadhaar: z.string().default(""), admissionDate: pastOrTodayDateSchema("Admission date"),
  fatherName: z.string().default(""), fatherPhone: z.string().default(""), fatherEmail: z.string().default(""),
  motherName: z.string().default(""), motherPhone: z.string().default(""), motherEmail: z.string().default(""),
  guardianName: z.string().default(""), guardianRelation: z.string().default(""), guardianPhone: z.string().default(""),
  address: z.string().default(""), academicYear: z.string().min(1), className: z.string().trim().min(1),
  section: z.string().default(""), rollNo: z.string().default(""), previousClass: z.string().default(""),
  previousSchool: z.string().default(""), feeCategory: z.string().default("Regular"),
  structureId: idSchema.nullable().optional(), structureIds: z.array(idSchema).optional(),
  discount: z.coerce.number().nonnegative().default(0),
  initialPayment: z.coerce.number().nonnegative().optional(),
  initialPaymentReference: z.string().trim().default(""),
  paymentMode: z.enum(["Cash", "UPI", "Card", "Bank Transfer"]).default("Cash"),
});
const promotionBody = z.object({
  sourceAcademicYear: z.string().min(1),
  targetAcademicYear: z.string().min(1),
  students: z.array(z.object({
    enrollmentId: idSchema,
    className: z.string().trim().min(1),
    section: z.string().trim().min(1),
    structureId: idSchema.optional(),
    structureIds: z.array(idSchema).optional(),
    discount: z.coerce.number().nonnegative(),
  })).min(1),
});
const paymentBody = z.object({
  id: idSchema.optional(),
  studentId: idSchema,
  amount: moneySchema,
  feeHeads: z.array(z.object({
    structureId: idSchema,
    position: z.coerce.number().int().nonnegative(),
  })).min(1).optional(),
  mode: z.enum(["Cash", "UPI", "Card", "Bank Transfer"]),
  reference: z.string().default(""), remarks: z.string().default(""),
  academicYear: z.string().min(1), date: z.string().date().optional(),
});
const archiveStudentBody = z.object({ reason: z.string().trim().max(500).default("") });
const cashierBody = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1), employeeId: z.string().trim().min(1), email: z.string().email(),
  phone: z.string().trim().min(1), username: z.string().trim().min(3), password: z.string().min(12).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});
const settingFields = {
  schoolName: "school_name", tagline: "tagline", location: "location", address: "address", phone: "phone",
  email: "email", website: "website", receiptFooter: "receipt_footer", principal: "principal",
};

function compareClassNames(left, right) {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function requireUuid(value) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Invalid record id");
  return value;
}

function mapYear(row) {
  return { id: row.id, name: row.name, active: row.active, ...(row.closed ? { closed: true } : {}) };
}

function mapClass(row) {
  return { id: row.id, name: row.name, sections: typeof row.sections === "string" ? JSON.parse(row.sections) : row.sections };
}

function mapStudent(row) {
  const structureIds = typeof row.structure_ids === "string"
    ? JSON.parse(row.structure_ids)
    : row.structure_ids;
  const result = {};
  for (const key of Object.keys(studentFields)) result[key] = row[studentFields[key]];
  return {
    id: row.enrollment_id ?? row.id,
    ...result,
    // MySQL returns DATE columns as Date objects.  JSON serializes those as an
    // ISO timestamp, but the admission form (and its API validation) requires
    // a calendar date in YYYY-MM-DD form when the record is edited again.
    dob: dateString(row.dob),
    admissionDate: dateString(row.admission_date),
    studentId: row.student_code ?? row.student_id,
    academicYear: row.academic_year,
    structureIds: structureIds ?? (row.structure_id ? [row.structure_id] : []),
    structureId: structureIds?.[0] ?? row.structure_id,
    discount: Number(row.discount),
    archived: Boolean(row.archived_at),
    archivedAt: row.archived_at ? row.archived_at.toISOString() : null,
    archiveReason: row.archive_reason ?? "",
  };
}

function mapStructure(row) {
  return {
    id: row.id, name: row.name, className: row.class_name, academicYear: row.academic_year,
    // mysql2 represents BOOLEAN/TINYINT values as 0 or 1.  Send a JSON boolean
    // back to the client so a fetched structure can be submitted for editing.
    active: Boolean(row.active),
    heads: (row.heads ?? []).map((head, position) => ({
      ...head,
      position: head.position ?? position,
      amount: Number(head.amount),
    })),
  };
}

function mapTerm(row) {
  return { id: row.id, structureId: row.structure_id, name: row.name, amount: Number(row.amount), dueDate: dateString(row.due_date) };
}

function dateString(value) {
  // MySQL DATE values are calendar dates. Serializing them with toISOString()
  // shifts an India-local date back one day because it converts to UTC.
  return value instanceof Date ? localDateString(value) : String(value).slice(0, 10);
}

function mapPayment(row) {
  const allocations = typeof row.fee_head_allocations === "string"
    ? JSON.parse(row.fee_head_allocations)
    : row.fee_head_allocations;
  const feeHeads = (allocations ?? []).map((allocation) => ({
    ...allocation,
    amount: Number(allocation.amount),
  }));
  return {
    id: row.id, receiptNo: row.receipt_no, studentId: row.enrollment_id ?? row.student_id,
    date: dateString(row.payment_date), studentName: row.student_name, admissionNo: row.student_admission_no,
    amount: Number(row.amount), mode: row.mode,
    reference: row.reference, remarks: row.remarks, cashierName: row.cashier_name,
    academicYear: row.academic_year, status: row.status,
    feeHeads,
  };
}

const studentSelect = `SELECT e.id AS enrollment_id, s.id AS student_uuid,
  s.admission_no, s.student_id AS student_code, s.first_name, s.last_name, s.dob, s.gender,
  s.blood_group, s.aadhaar, s.admission_date, s.father_name, s.father_phone, s.father_email,
  s.mother_name, s.mother_phone, s.mother_email, s.guardian_name, s.guardian_relation,
  s.guardian_phone, s.address, s.previous_school, e.academic_year_id, ay.name AS academic_year,
  e.class_name, e.section, e.roll_no, e.previous_class, e.fee_category, e.structure_id, e.discount,
  COALESCE((SELECT JSON_ARRAYAGG(efs.structure_id)
              FROM student_enrollment_fee_structures efs
             WHERE efs.enrollment_id = e.id), JSON_ARRAY()) AS structure_ids,
  e.archived_at, e.archived_by, e.archive_reason
  FROM student_enrollments e JOIN students s ON s.id = e.student_id
  JOIN academic_years ay ON ay.id = e.academic_year_id`;

async function findYear(client, name) {
  const { rows } = await client.query("SELECT id, name FROM academic_years WHERE name = $1", [name]);
  if (!rows[0]) throw new HttpError(400, `Academic year '${name}' does not exist`);
  return rows[0];
}

async function fetchStudent(client, id, { lock = false } = {}) {
  const { rows } = await client.query(
    `${studentSelect} WHERE e.id = $1 ${lock ? "FOR UPDATE OF e, s" : ""}`,
    [id],
  );
  if (!rows[0]) throw new HttpError(404, "Student not found");
  return rows[0];
}

async function studentBalance(client, student) {
  if (!student.structure_ids.length) return { payable: 0, paid: 0, balance: 0 };
  const totals = await client.query(
    `SELECT COALESCE(SUM(fh.amount), 0) AS total
       FROM fee_heads fh
      WHERE fh.structure_id IN (
              SELECT efs.structure_id FROM student_enrollment_fee_structures efs
               WHERE efs.enrollment_id = $1
            )
        AND (NOT EXISTS (
               SELECT 1 FROM fee_head_applicability fha
                WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
             ) OR EXISTS (
               SELECT 1 FROM fee_head_applicability fha
                WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
                  AND fha.student_enrollment_id = $2
             ))`,
    [student.enrollment_id, student.enrollment_id],
  );
  const paid = await client.query("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE enrollment_id = $1", [student.enrollment_id]);
  const payable = Math.max(Number(totals.rows[0].total) - Number(student.discount), 0);
  const paidAmount = Number(paid.rows[0].total);
  return { payable, paid: paidAmount, balance: Math.max(payable - paidAmount, 0) };
}

async function studentFeeHeadBalances(client, student) {
  const { rows: heads } = await client.query(
    `SELECT fh.structure_id, fh.position, fh.name, fh.amount
       FROM fee_heads fh
       JOIN fee_structures fs ON fs.id = fh.structure_id
      WHERE fh.structure_id IN (
              SELECT efs.structure_id FROM student_enrollment_fee_structures efs
               WHERE efs.enrollment_id = $1
            )
        AND (NOT EXISTS (
               SELECT 1 FROM fee_head_applicability fha
                WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
             ) OR EXISTS (
               SELECT 1 FROM fee_head_applicability fha
                WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
                  AND fha.student_enrollment_id = $1
             ))
      ORDER BY fs.name, fh.structure_id, fh.position`,
    [student.enrollment_id],
  );
  const balances = heads.map((head) => ({
    structureId: head.structure_id,
    position: Number(head.position),
    name: head.name,
    amount: Number(head.amount),
    paid: 0,
    balance: Number(head.amount),
  }));
  let discount = Number(student.discount);
  for (const head of balances) {
    const appliedDiscount = Math.min(head.balance, discount);
    head.balance -= appliedDiscount;
    discount -= appliedDiscount;
  }

  const { rows: paymentRows } = await client.query(
    `SELECT p.id, p.amount, p.payment_date, p.receipt_no, p.created_at,
            pfa.structure_id, pfa.head_position, pfa.amount AS allocated_amount
       FROM payments p
       LEFT JOIN payment_fee_head_allocations pfa ON pfa.payment_id = p.id
      WHERE p.enrollment_id = $1
      ORDER BY p.payment_date, p.receipt_no, p.created_at, pfa.structure_id, pfa.head_position`,
    [student.enrollment_id],
  );
  const paymentMap = new Map();
  for (const row of paymentRows) {
    let payment = paymentMap.get(row.id);
    if (!payment) {
      payment = { amount: Number(row.amount), feeHeads: [] };
      paymentMap.set(row.id, payment);
    }
    if (row.structure_id) {
      payment.feeHeads.push({
        structureId: row.structure_id,
        position: Number(row.head_position),
        amount: Number(row.allocated_amount),
      });
    }
  }
  for (const payment of paymentMap.values()) {
    if (payment.feeHeads.length) {
      for (const allocation of payment.feeHeads) {
        const head = balances.find(
          (item) =>
            item.structureId === allocation.structureId &&
            item.position === allocation.position,
        );
        if (!head) continue;
        const applied = Math.min(head.balance, allocation.amount);
        head.paid += applied;
        head.balance -= applied;
      }
    } else {
      let remaining = payment.amount;
      for (const head of balances) {
        const applied = Math.min(head.balance, remaining);
        head.paid += applied;
        head.balance -= applied;
        remaining -= applied;
        if (remaining <= 0) break;
      }
    }
  }
  return balances;
}

async function validateFeeAssignments(client, { structureIds, className, academicYear, studentId = null }) {
  if (!structureIds.length) return 0;
  if (new Set(structureIds).size !== structureIds.length) {
    throw new HttpError(400, "Selected fee structures must not contain duplicates");
  }
  const placeholders = structureIds.map((_, index) => `$${index + 1}`).join(", ");
  const studentPlaceholder = `$${structureIds.length + 1}`;
  const { rows } = await client.query(
    `SELECT fs.class_name, ay.name AS academic_year, fs.active,
            COALESCE(SUM(
              CASE WHEN NOT EXISTS (
                SELECT 1 FROM fee_head_applicability fha
                 WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
              ) OR EXISTS (
                SELECT 1 FROM fee_head_applicability fha
                 WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
                   AND fha.student_enrollment_id = ${studentPlaceholder}
              ) THEN fh.amount ELSE 0 END
            ), 0) AS total
       FROM fee_structures fs
       JOIN academic_years ay ON ay.id = fs.academic_year_id
       LEFT JOIN fee_heads fh ON fh.structure_id = fs.id
       WHERE fs.id IN (${placeholders})
      GROUP BY fs.id, ay.name`,
    [...structureIds, studentId],
  );
  if (rows.length !== structureIds.length) {
    throw new HttpError(400, "One or more selected fee structures do not exist");
  }
  for (const structure of rows) {
    if (
       !structure.active ||
       structure.class_name !== className ||
       structure.academic_year !== academicYear
    ) {
       throw new HttpError(400, "Every fee structure must be active and match the selected class and academic year");
    }
  }
  return rows.reduce((total, structure) => total + Number(structure.total), 0);
}

async function assignFeeStructures(client, enrollmentId, structureIds) {
  const uniqueIds = [...new Set(structureIds)];
  if (uniqueIds.length !== structureIds.length) {
    throw new HttpError(400, "Selected fee structures must not contain duplicates");
  }
  await client.query("DELETE FROM student_enrollment_fee_structures WHERE enrollment_id = $1", [enrollmentId]);
  for (const structureId of uniqueIds) {
    await client.query(
       "INSERT INTO student_enrollment_fee_structures (enrollment_id, structure_id) VALUES ($1, $2)",
       [enrollmentId, structureId],
    );
  }
  await client.query("UPDATE student_enrollments SET structure_id = $2 WHERE id = $1", [
    enrollmentId,
    uniqueIds[0] ?? null,
  ]);
}

function requestedStructureIds(input, fallback = []) {
  if (input.structureIds !== undefined) return input.structureIds;
  if (input.structureId !== undefined) return input.structureId ? [input.structureId] : [];
  return fallback;
}

async function nextReceiptNumber(client) {
  const receiptYear = new Date().getFullYear();
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(receipt_no, '-', -1) AS UNSIGNED)), 0) + 1 AS next
       FROM payments WHERE receipt_no LIKE $1`,
    [`ED-${receiptYear}-%`],
  );
  return `ED-${receiptYear}-${String(rows[0].next).padStart(4, "0")}`;
}

router.get("/health", asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", database: "connected" });
}));

router.use(authenticate);

router.get("/academic-years", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM academic_years ORDER BY name");
  res.json(rows.map(mapYear));
}));

router.post("/academic-years", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = yearBody.parse(req.body);
  const row = await transaction(async (client) => {
    if (input.active) await client.query("UPDATE academic_years SET active = FALSE");
    const result = await client.query(
      "INSERT INTO academic_years (id, name, active, closed) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4) RETURNING *",
      [input.id ?? null, input.name, input.active ?? false, input.closed ?? false],
    );
    return result.rows[0];
  });
  res.status(201).json(mapYear(row));
}));

router.patch("/academic-years/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = yearBody.partial().parse(req.body);
  const row = await transaction(async (client) => {
    const old = await client.query("SELECT * FROM academic_years WHERE id = $1 FOR UPDATE", [id]);
    if (!old.rows[0]) throw new HttpError(404, "Academic year not found");
    const current = old.rows[0];
    const nextName = input.name ?? current.name;
    const nextActive = input.active ?? current.active;
    if (nextActive) await client.query("UPDATE academic_years SET active = FALSE WHERE id <> $1", [id]);
    const updated = await client.query(
      "UPDATE academic_years SET name = $2, active = $3, closed = $4 WHERE id = $1 RETURNING *",
      [id, nextName, nextActive, input.closed ?? current.closed],
    );
    return updated.rows[0];
  });
  res.json(mapYear(row));
}));

router.get("/active-year", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("SELECT name FROM academic_years WHERE active = TRUE");
  res.json({ activeYear: rows[0]?.name ?? null });
}));

router.put("/active-year", allowRoles("admin"), asyncHandler(async (req, res) => {
  const { activeYear } = z.object({ activeYear: z.string().min(1) }).parse(req.body);
  await transaction(async (client) => {
    const year = await findYear(client, activeYear);
    await client.query("UPDATE academic_years SET active = FALSE");
    await client.query("UPDATE academic_years SET active = TRUE WHERE id = $1", [year.id]);
  });
  res.json({ activeYear });
}));

router.get("/classes", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM school_classes ORDER BY name");
  res.json(rows.map(mapClass));
}));

router.post("/classes", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = classBody.parse(req.body);
  const sections = [...new Set(input.sections.map((section) => section.toUpperCase()))];
  const { rows } = await pool.query("INSERT INTO school_classes (id, name, sections) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3) RETURNING *", [input.id ?? null, input.name, sections]);
  res.status(201).json(mapClass(rows[0]));
}));

router.patch("/classes/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = classBody.parse(req.body);
  const row = await transaction(async (client) => {
    const existing = await client.query("SELECT * FROM school_classes WHERE id = $1 FOR UPDATE", [id]);
    if (!existing.rows[0]) throw new HttpError(404, "Class not found");
    const current = existing.rows[0];
    if (current.name !== input.name) {
      await client.query("UPDATE student_enrollments SET class_name = $2 WHERE class_name = $1", [current.name, input.name]);
      await client.query("UPDATE fee_structures SET class_name = $2 WHERE class_name = $1", [current.name, input.name]);
    }
    const updated = await client.query("UPDATE school_classes SET name = $2, sections = $3 WHERE id = $1 RETURNING *", [id, input.name, [...new Set(input.sections.map((section) => section.toUpperCase()))]]);
    return updated.rows[0];
  });
  res.json(mapClass(row));
}));

router.delete("/classes/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const result = await transaction(async (client) => {
    const { rows } = await client.query("SELECT name FROM school_classes WHERE id = $1 FOR UPDATE", [id]);
    if (!rows[0]) throw new HttpError(404, "Class not found");
    const linked = await client.query("SELECT EXISTS (SELECT 1 FROM student_enrollments WHERE class_name = $1) AS used", [rows[0].name]);
    if (linked.rows[0].used) throw new HttpError(409, "Class is assigned to students and cannot be deleted");
    return client.query("DELETE FROM school_classes WHERE id = $1", [id]);
  });
  res.status(204).end();
}));

router.get("/fee-structures", asyncHandler(async (req, res) => {
  const values = [];
  let where = "";
  if (req.query.academicYear) {
    values.push(req.query.academicYear);
    where = "WHERE ay.name = $1";
  }
  const { rows } = await pool.query(
    `SELECT fs.*, ay.name AS academic_year FROM fee_structures fs
       JOIN academic_years ay ON ay.id = fs.academic_year_id ${where}
      ORDER BY fs.class_name, fs.name`, values,
  );
  const structures = await Promise.all(rows.map(async (structure) => {
    const heads = await pool.query(
      `SELECT fh.name, fh.amount, fh.position,
              fha.head_position AS applicability_position, fha.student_enrollment_id
         FROM fee_heads fh
         LEFT JOIN fee_head_applicability fha
           ON fha.structure_id = fh.structure_id AND fha.head_position = fh.position
        WHERE fh.structure_id = $1
        ORDER BY fh.position, fha.student_enrollment_id`,
      [structure.id],
    );
    const groupedHeads = new Map();
    for (const row of heads.rows) {
      let head = groupedHeads.get(row.position);
      if (!head) {
        head = {
          name: row.name,
          amount: row.amount,
          position: row.position,
          optional: row.applicability_position !== null,
          studentIds: [],
        };
        groupedHeads.set(row.position, head);
      }
      if (row.student_enrollment_id) head.studentIds.push(row.student_enrollment_id);
    }
    return mapStructure({ ...structure, heads: [...groupedHeads.values()] });
  }));
  res.json(structures);
}));

async function saveStructureHeads(client, structureId, heads, className, academicYearId) {
  for (const head of heads) {
    if (new Set(head.studentIds).size !== head.studentIds.length) {
      throw new HttpError(400, "Optional fee student selections must not contain duplicates");
    }
  }
  const selectedIds = [...new Set(heads.flatMap((head) => head.optional ? head.studentIds : []))];
  if (selectedIds.length) {
    const placeholders = selectedIds.map((_, index) => `$${index + 1}`).join(", ");
    const validStudents = await client.query(
      `SELECT id FROM student_enrollments
        WHERE id IN (${placeholders}) AND class_name = $${selectedIds.length + 1}
          AND academic_year_id = $${selectedIds.length + 2}
          AND structure_id = $${selectedIds.length + 3}`,
      [...selectedIds, className, academicYearId, structureId],
    );
    if (validStudents.rows.length !== selectedIds.length) {
      throw new HttpError(400, "Optional fee students must be active and match the fee structure class and academic year");
    }
  }

  for (const [position, head] of heads.entries()) {
    await client.query(
      "INSERT INTO fee_heads (structure_id, name, amount, position) VALUES ($1, $2, $3, $4)",
      [structureId, head.name, head.amount, position],
    );
    if (head.optional) {
      const studentIds = [...new Set(head.studentIds)];
      await client.query(
        "INSERT INTO fee_head_applicability (structure_id, head_position, student_enrollment_id) VALUES ($1, $2, NULL)",
        [structureId, position],
      );
      for (const studentId of studentIds) {
        await client.query(
          "INSERT INTO fee_head_applicability (structure_id, head_position, student_enrollment_id) VALUES ($1, $2, $3)",
          [structureId, position, studentId],
        );
      }
    }
  }
}

router.post("/fee-structures", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = structureBody.parse(req.body);
  const created = await transaction(async (client) => {
    const year = await findYear(client, input.academicYear);
    const structure = await client.query(
      "INSERT INTO fee_structures (id, name, class_name, academic_year_id, active) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5) RETURNING *",
      [input.id ?? null, input.name, input.className, year.id, input.active],
    );
    await saveStructureHeads(client, structure.rows[0].id, input.heads, input.className, year.id);
    return { ...structure.rows[0], academic_year: year.name, heads: input.heads };
  });
  res.status(201).json(mapStructure(created));
}));

router.patch("/fee-structures/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = structureBody.parse(req.body);
  const updated = await transaction(async (client) => {
    const year = await findYear(client, input.academicYear);
    const result = await client.query(
      `UPDATE fee_structures SET name = $2, class_name = $3, academic_year_id = $4, active = $5
        WHERE id = $1 RETURNING *`,
      [id, input.name, input.className, year.id, input.active],
    );
    if (!result.rows[0]) throw new HttpError(404, "Fee structure not found");
    await client.query("DELETE FROM fee_head_applicability WHERE structure_id = $1", [id]);
    await client.query("DELETE FROM fee_heads WHERE structure_id = $1", [id]);
    await saveStructureHeads(client, id, input.heads, input.className, year.id);
    return { ...result.rows[0], academic_year: year.name, heads: input.heads };
  });
  res.json(mapStructure(updated));
}));

router.delete("/fee-structures/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  await transaction(async (client) => {
    const structure = await client.query("SELECT id FROM fee_structures WHERE id = $1 FOR UPDATE", [id]);
    if (!structure.rows[0]) throw new HttpError(404, "Fee structure not found");
    const assigned = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM student_enrollment_fee_structures WHERE structure_id = $1
         UNION ALL
         SELECT 1 FROM payment_fee_head_allocations WHERE structure_id = $1
       ) AS used`,
      [id],
    );
    if (assigned.rows[0].used) {
      throw new HttpError(409, "Fee structure is assigned to students or has payment history; deactivate it instead of deleting it");
    }
    await client.query("DELETE FROM fee_structures WHERE id = $1", [id]);
  });
  res.status(204).end();
}));

router.get("/fee-terms", asyncHandler(async (req, res) => {
  const values = [];
  const where = req.query.structureId ? (values.push(requireUuid(req.query.structureId)), "WHERE structure_id = $1") : "";
  const { rows } = await pool.query(`SELECT * FROM fee_terms ${where} ORDER BY position, due_date`, values);
  res.json(rows.map(mapTerm));
}));

router.post("/fee-terms", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = termBody.parse(req.body);
  const { rows } = await pool.query("INSERT INTO fee_terms (id, structure_id, name, amount, due_date) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5) RETURNING *", [input.id ?? null, input.structureId, input.name, input.amount, input.dueDate]);
  res.status(201).json(mapTerm(rows[0]));
}));

router.put("/fee-terms", allowRoles("admin"), asyncHandler(async (req, res) => {
  const structureId = requireUuid(req.query.structureId);
  const terms = termScheduleBody.parse(req.body);
  const result = await transaction(async (client) => {
    const structure = await client.query("SELECT id FROM fee_structures WHERE id = $1 FOR UPDATE", [structureId]);
    if (!structure.rows[0]) throw new HttpError(404, "Fee structure not found");
    const total = await client.query(
      `SELECT COALESCE(SUM(fh.amount), 0) AS total
         FROM fee_heads fh
        WHERE fh.structure_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM fee_head_applicability fha
             WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
          )`,
      [structureId],
    );
    const proposedTotal = terms.reduce((sum, term) => sum + term.amount, 0);
    if (Math.abs(proposedTotal - Number(total.rows[0].total)) > 0.001) {
      throw new HttpError(400, "Installment amounts must equal the annual fee structure total");
    }
    await client.query("DELETE FROM fee_terms WHERE structure_id = $1", [structureId]);
    const saved = [];
    for (const [position, term] of terms.entries()) {
      const { rows } = await client.query(
        "INSERT INTO fee_terms (id, structure_id, name, amount, due_date, position) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6) RETURNING *",
        [term.id ?? null, structureId, term.name, term.amount, term.dueDate, position],
      );
      saved.push(rows[0]);
    }
    return saved;
  });
  res.json(result.map(mapTerm));
}));

router.patch("/fee-terms/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = termBody.partial().parse(req.body);
  const { rows } = await pool.query(
    `UPDATE fee_terms SET name = COALESCE($2, name), amount = COALESCE($3, amount), due_date = COALESCE($4, due_date)
      WHERE id = $1 RETURNING *`,
    [id, input.name ?? null, input.amount ?? null, input.dueDate ?? null],
  );
  if (!rows[0]) throw new HttpError(404, "Fee term not found");
  res.json(mapTerm(rows[0]));
}));

router.delete("/fee-terms/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const result = await pool.query("DELETE FROM fee_terms WHERE id = $1", [requireUuid(req.params.id)]);
  if (!result.rowCount) throw new HttpError(404, "Fee term not found");
  res.status(204).end();
}));

router.get("/students", asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];
  if (req.query.includeArchived !== "true") filters.push("e.archived_at IS NULL");
  if (req.query.academicYear) { values.push(req.query.academicYear); filters.push(`ay.name = $${values.length}`); }
  if (req.query.className) { values.push(req.query.className); filters.push(`e.class_name = $${values.length}`); }
  if (req.query.q) {
    values.push(`%${String(req.query.q).trim()}%`);
    filters.push(`(s.first_name ILIKE $${values.length} OR s.last_name ILIKE $${values.length} OR s.admission_no ILIKE $${values.length} OR s.student_id ILIKE $${values.length})`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await pool.query(`${studentSelect} ${where} ORDER BY ay.name, e.class_name, s.admission_no`, values);
  res.json(rows.map(mapStudent));
}));

router.get("/students/:id", asyncHandler(async (req, res) => {
  const row = await fetchStudent(pool, requireUuid(req.params.id));
  const balance = await studentBalance(pool, row);
  res.json({ ...mapStudent(row), feeSummary: balance });
}));

router.post("/students", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = studentBody.parse(req.body);
  const created = await transaction(async (client) => {
    const year = await findYear(client, input.academicYear);
    const structureIds = requestedStructureIds(input);
    const feeTotal = await validateFeeAssignments(client, {
      structureIds,
      className: input.className,
      academicYear: year.name,
    });
    if (input.discount > feeTotal) throw new HttpError(400, "Discount exceeds the selected fee total");
    const coreKeys = Object.keys(studentFields).filter((key) => studentCoreKeys.has(key));
    const coreColumns = [
      ...coreKeys.map((key) => studentFields[key]),
    ];
    const coreValues = [
      ...coreKeys.map((key) => input[key] ?? ""),
    ];
    const coreParams = coreValues.map((_, index) => `$${index + 1}`);
    const inserted = await client.query(
      `INSERT INTO students (${coreColumns.join(", ")}) VALUES (${coreParams.join(", ")}) RETURNING id`,
      coreValues,
    );
    const enrollmentId = input.id ?? undefined;
    const enrollment = await client.query(
      `INSERT INTO student_enrollments (
         id, student_id, academic_year_id, class_name, section, roll_no, previous_class,
         fee_category, structure_id, discount, archive_reason
       ) VALUES (
         COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8, $9, $10, ''
       ) RETURNING id`,
      [enrollmentId ?? null, inserted.rows[0].id, year.id, input.className, input.section,
        input.rollNo, input.previousClass, input.feeCategory, structureIds[0] ?? null, input.discount],
    );
    await assignFeeStructures(client, enrollment.rows[0].id, structureIds);
    const student = await fetchStudent(client, enrollment.rows[0].id);
    let payment = null;
    if (input.initialPayment > 0) {
      const totals = await studentBalance(client, student);
      if (input.initialPayment > totals.balance) throw new HttpError(400, "Initial payment exceeds the student balance");
      payment = await insertPayment(client, {
        studentId: student.enrollment_id, amount: input.initialPayment, mode: input.paymentMode,
        reference: input.initialPaymentReference, remarks: "Admission payment",
        academicYear: year.name,
      }, req.user.name);
    }
    return { student, payment };
  });
  res.status(201).json({ ...mapStudent(created.student), payment: created.payment ? mapPayment(created.payment) : null });
}));

router.patch("/students/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = studentBody.omit({ initialPayment: true, initialPaymentReference: true, paymentMode: true }).partial().parse(req.body);
  const updated = await transaction(async (client) => {
    const existing = await fetchStudent(client, id, { lock: true });
    if (existing.archived_at) throw new HttpError(409, "Restore the archived student enrollment before editing it");
    const feeAssignmentChanged = ["structureId", "structureIds", "className", "academicYear", "discount"].some(
      (key) => input[key] !== undefined,
    );
    const year = input.academicYear
      ? await findYear(client, input.academicYear)
      : { id: existing.academic_year_id, name: existing.academic_year };
    const structureIds = requestedStructureIds(input, existing.structure_ids);
    if (feeAssignmentChanged || input.className !== undefined || input.academicYear !== undefined) {
      const feeTotal = await validateFeeAssignments(client, {
        structureIds,
        className: input.className ?? existing.class_name,
        academicYear: year.name,
        studentId: id,
      });
      if ((input.discount ?? Number(existing.discount)) > feeTotal) {
        throw new HttpError(400, "Discount exceeds the selected fee total");
      }
    }
    const coreKeys = Object.keys(studentFields).filter((key) => studentCoreKeys.has(key) && input[key] !== undefined);
    if (coreKeys.length) {
      const values = [existing.student_uuid];
      const assignments = coreKeys.map((key) => {
        values.push(input[key]);
        return `${studentFields[key]} = $${values.length}`;
      });
      await client.query(`UPDATE students SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = $1`, values);
    }
    const enrollmentKeys = Object.keys(studentFields).filter((key) => studentEnrollmentKeys.has(key) && input[key] !== undefined);
    if (input.academicYear && input.academicYear !== existing.academic_year) {
      const payments = await client.query("SELECT EXISTS (SELECT 1 FROM payments WHERE enrollment_id = $1) AS has_payments", [id]);
      if (payments.rows[0].has_payments) throw new HttpError(409, "An enrollment with payments cannot be moved to another academic year");
      const year = await findYear(client, input.academicYear);
      const duplicate = await client.query("SELECT EXISTS (SELECT 1 FROM student_enrollments WHERE student_id = $1 AND academic_year_id = $2 AND id <> $3) AS exists", [existing.student_uuid, year.id, id]);
      if (duplicate.rows[0].exists) throw new HttpError(409, "This student already has an enrollment for that academic year");
      await client.query("UPDATE student_enrollments SET academic_year_id = $2 WHERE id = $1", [id, year.id]);
    }
    if (enrollmentKeys.length) {
      const values = [id];
      const assignments = enrollmentKeys.map((key) => {
        values.push(input[key]);
        return `${studentFields[key]} = $${values.length}`;
      });
      await client.query(`UPDATE student_enrollments SET ${assignments.join(", ")} WHERE id = $1`, values);
    }
    if (feeAssignmentChanged || input.className !== undefined || input.academicYear !== undefined) {
      await assignFeeStructures(client, id, structureIds);
    }
    return fetchStudent(client, id);
  });
  res.json(mapStudent(updated));
}));

router.patch("/students/:id/archive", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const { reason } = archiveStudentBody.parse(req.body);
  const result = await pool.query(
    `UPDATE student_enrollments SET archived_at = NOW(), archived_by = $2, archive_reason = $3
      WHERE id = $1 AND archived_at IS NULL RETURNING id`,
    [id, req.user.sub, reason],
  );
  if (!result.rows[0]) {
    await fetchStudent(pool, id);
    throw new HttpError(409, "Student enrollment is already archived");
  }
  res.json(mapStudent(await fetchStudent(pool, id)));
}));

router.patch("/students/:id/restore", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const result = await pool.query(
    `UPDATE student_enrollments SET archived_at = NULL, archived_by = NULL, archive_reason = ''
      WHERE id = $1 AND archived_at IS NOT NULL RETURNING id`,
    [id],
  );
  if (!result.rows[0]) {
    await fetchStudent(pool, id);
    throw new HttpError(409, "Student enrollment is already active");
  }
  res.json(mapStudent(await fetchStudent(pool, id)));
}));

router.post("/promotions", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = promotionBody.parse(req.body);
  if (input.sourceAcademicYear === input.targetAcademicYear) {
    throw new HttpError(400, "Source and target academic years must be different");
  }
  const promoted = await transaction(async (client) => {
    const sourceYear = await findYear(client, input.sourceAcademicYear);
    const targetYear = await findYear(client, input.targetAcademicYear);
    const targetYearStatus = await client.query("SELECT closed FROM academic_years WHERE id = $1", [targetYear.id]);
    if (targetYearStatus.rows[0].closed) throw new HttpError(409, "Cannot promote students into a closed academic year");
    const configuredClasses = await client.query("SELECT name FROM school_classes");
    const classNames = configuredClasses.rows.map((row) => row.name).sort(compareClassNames);

    const results = [];
    for (const choice of input.students) {
      const source = await fetchStudent(client, choice.enrollmentId, { lock: true });
      if (source.academic_year_id !== sourceYear.id) {
        throw new HttpError(400, `Student ${source.admission_no} is not enrolled in the selected source year`);
      }
      const sourceClassIndex = classNames.indexOf(source.class_name);
      if (sourceClassIndex === classNames.length - 1 && sourceClassIndex >= 0) {
        throw new HttpError(409, `Students in the final class '${source.class_name}' cannot be promoted`);
      }
      const classResult = await client.query(
        "SELECT EXISTS (SELECT 1 FROM school_classes WHERE name = $1 AND JSON_CONTAINS(sections, JSON_QUOTE($2))) AS valid",
        [choice.className, choice.section],
      );
      if (!classResult.rows[0].valid) throw new HttpError(400, `Invalid class or section for ${source.admission_no}`);

      const structureIds = requestedStructureIds(choice);
      if (structureIds.length === 0) {
        throw new HttpError(400, `Select at least one target-year fee structure for ${source.admission_no}`);
      }
      const feeTotal = await validateFeeAssignments(client, {
        structureIds,
        className: choice.className,
        academicYear: targetYear.name,
      });
      if (choice.discount > feeTotal) {
        throw new HttpError(400, `Discount exceeds the fee total for ${source.admission_no}`);
      }

      const enrollment = await client.query(
        `INSERT INTO student_enrollments (
           student_id, academic_year_id, class_name, section, roll_no, previous_class,
           fee_category, structure_id, discount, archive_reason
         ) VALUES ($1, $2, $3, $4, '', $5, $6, $7, $8, '') RETURNING id`,
        [source.student_uuid, targetYear.id, choice.className, choice.section, source.class_name,
          source.fee_category, structureIds[0], choice.discount],
      );
      await assignFeeStructures(client, enrollment.rows[0].id, structureIds);
      results.push(await fetchStudent(client, enrollment.rows[0].id));
    }
    return results;
  });
  res.status(201).json(promoted.map(mapStudent));
}));

async function insertPayment(client, input, cashierName) {
  if (input.mode !== "Cash" && !input.reference.trim()) {
    throw new HttpError(400, "A payment reference is required for non-cash payments");
  }
  const year = await findYear(client, input.academicYear);
  const student = await fetchStudent(client, input.studentId);
  if (student.archived_at) throw new HttpError(409, "Cannot record a payment for an archived student enrollment");
  if (student.academic_year_id !== year.id) {
    throw new HttpError(400, "Payment academic year must match the selected student enrollment");
  }
  const receiptNo = await nextReceiptNumber(client);
  const { rows } = await client.query(
    `INSERT INTO payments (id, receipt_no, student_id, enrollment_id, student_admission_no, student_name, payment_date, amount, mode, reference, remarks, cashier_name, academic_year_id)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, COALESCE($7::date, CURRENT_DATE), $8, $9, $10, $11, $12, $13) RETURNING *`,
    [input.id ?? null, receiptNo, student.student_uuid, student.enrollment_id, student.admission_no, `${student.first_name} ${student.last_name}`.trim(), input.date ?? null, input.amount, input.mode, input.reference || "", input.remarks || "", cashierName, year.id],
  );
  return { ...rows[0], academic_year: year.name };
}

router.get("/payments", asyncHandler(async (req, res) => {
  const filters = [];
  const values = [];
  if (req.query.academicYear) { values.push(req.query.academicYear); filters.push(`ay.name = $${values.length}`); }
  if (req.query.studentId) { values.push(requireUuid(req.query.studentId)); filters.push(`p.enrollment_id = $${values.length}`); }
  if (req.query.from) { values.push(req.query.from); filters.push(`p.payment_date >= $${values.length}::date`); }
  if (req.query.to) { values.push(req.query.to); filters.push(`p.payment_date <= $${values.length}::date`); }
  if (req.query.cashier) { values.push(req.query.cashier); filters.push(`p.cashier_name = $${values.length}`); }
  if (req.query.mode) { values.push(req.query.mode); filters.push(`p.mode = $${values.length}`); }
  if (req.query.className) { values.push(req.query.className); filters.push(`e.class_name = $${values.length}`); }
  if (req.query.section) { values.push(req.query.section); filters.push(`e.section = $${values.length}`); }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT p.*, ay.name AS academic_year,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT(
               'structureId', pfa.structure_id,
               'position', pfa.head_position,
               'headName', pfa.head_name,
               'amount', pfa.amount
             ))
               FROM payment_fee_head_allocations pfa
              WHERE pfa.payment_id = p.id) AS fee_head_allocations
       FROM payments p
       JOIN academic_years ay ON ay.id = p.academic_year_id
       LEFT JOIN student_enrollments e ON e.id = p.enrollment_id
       ${where}
      ORDER BY p.payment_date DESC, p.created_at DESC`,
    values,
  );
  res.json(rows.map(mapPayment));
}));

router.post("/payments", asyncHandler(async (req, res) => {
  const input = paymentBody.parse(req.body);
  if (input.mode !== "Cash" && !input.reference.trim()) throw new HttpError(400, "A payment reference is required for non-cash payments");
  const payment = await transaction(async (client) => {
    const student = await fetchStudent(client, input.studentId, { lock: true });
    const balance = await studentBalance(client, student);
    if (input.amount > balance.balance) throw new HttpError(400, "Payment amount exceeds the current balance");
    let allocations = [];
    if (input.feeHeads) {
      const headBalances = await studentFeeHeadBalances(client, student);
      const available = new Map(
        headBalances.map((head) => [`${head.structureId}:${head.position}`, head]),
      );
      const selected = [];
      for (const requested of input.feeHeads) {
        const key = `${requested.structureId}:${requested.position}`;
        const head = available.get(key);
        if (!head) throw new HttpError(400, "A selected fee head is not assigned to this student");
        if (selected.some((item) => item.structureId === requested.structureId && item.position === requested.position)) {
          throw new HttpError(400, "Selected fee heads must not contain duplicates");
        }
        selected.push(head);
      }
      const selectedBalance = selected.reduce((sum, head) => sum + head.balance, 0);
      if (input.amount > selectedBalance + 0.001) {
        throw new HttpError(400, "Payment amount exceeds the selected fee heads' outstanding balance");
      }
      let remaining = Math.round(input.amount * 100);
      for (const head of selected) {
        if (!remaining) break;
        const allocatedCents = Math.min(remaining, Math.round(head.balance * 100));
        if (allocatedCents <= 0) continue;
        const amount = allocatedCents / 100;
        allocations.push({
          structureId: head.structureId,
          position: head.position,
          headName: head.name,
          amount,
        });
        remaining -= allocatedCents;
      }
      if (remaining > 0) throw new HttpError(400, "Could not allocate the full payment to selected fee heads");
    }
    const row = await insertPayment(client, input, req.user.name);
    for (const allocation of allocations) {
      await client.query(
        `INSERT INTO payment_fee_head_allocations
           (payment_id, structure_id, head_position, head_name, amount)
         VALUES ($1, $2, $3, $4, $5)`,
        [row.id, allocation.structureId, allocation.position, allocation.headName, allocation.amount],
      );
    }
    return { ...row, fee_head_allocations: allocations.map((allocation) => ({
      structureId: allocation.structureId,
      position: allocation.position,
      headName: allocation.headName,
      amount: allocation.amount,
    })) };
  });
  res.status(201).json(mapPayment(payment));
}));

router.get("/payments/:id", asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, ay.name AS academic_year,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT(
               'structureId', pfa.structure_id,
               'position', pfa.head_position,
               'headName', pfa.head_name,
               'amount', pfa.amount
             ))
               FROM payment_fee_head_allocations pfa
              WHERE pfa.payment_id = p.id) AS fee_head_allocations
       FROM payments p
       JOIN academic_years ay ON ay.id = p.academic_year_id
      WHERE p.id = $1`,
    [requireUuid(req.params.id)],
  );
  if (!rows[0]) throw new HttpError(404, "Payment not found");
  res.json(mapPayment(rows[0]));
}));

router.get("/cashiers", allowRoles("admin"), asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, u.username FROM cashiers c LEFT JOIN users u ON u.id = c.user_id ORDER BY c.name`,
  );
  res.json(rows.map((row) => ({ id: row.id, name: row.name, employeeId: row.employee_id, email: row.email, phone: row.phone, username: row.username, status: row.status, createdAt: row.created_at.toISOString().slice(0, 10) })));
}));

router.post("/cashiers", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = cashierBody.parse(req.body);
  if (!input.password) throw new HttpError(400, "A password is required when creating a cashier");
  const result = await transaction(async (client) => {
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await client.query(
      "INSERT INTO users (name, username, password_hash, role, active) VALUES ($1, $2, $3, 'cashier', $4) RETURNING id, username",
      [input.name, input.username, passwordHash, input.status === "active"],
    );
    const cashier = await client.query(
      "INSERT INTO cashiers (id, user_id, name, employee_id, email, phone, status) VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7) RETURNING *",
      [input.id ?? null, user.rows[0].id, input.name, input.employeeId, input.email, input.phone, input.status],
    );
    return { ...cashier.rows[0], username: user.rows[0].username };
  });
  res.status(201).json({ id: result.id, name: result.name, employeeId: result.employee_id, email: result.email, phone: result.phone, username: result.username, status: result.status, createdAt: result.created_at.toISOString().slice(0, 10) });
}));

router.patch("/cashiers/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const id = requireUuid(req.params.id);
  const input = cashierBody.partial().parse(req.body);
  const result = await transaction(async (client) => {
    const existing = await client.query("SELECT c.*, u.username, u.id AS account_id FROM cashiers c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = $1 FOR UPDATE OF c", [id]);
    if (!existing.rows[0]) throw new HttpError(404, "Cashier not found");
    const old = existing.rows[0];
    const fields = { name: "name", employeeId: "employee_id", email: "email", phone: "phone", status: "status" };
    const vals = [id];
    const sets = Object.entries(fields).filter(([key]) => input[key] !== undefined).map(([key, column]) => { vals.push(input[key]); return `${column} = $${vals.length}`; });
    if (sets.length) await client.query(`UPDATE cashiers SET ${sets.join(", ")} WHERE id = $1`, vals);
    if (old.account_id && (input.name || input.username || input.password || input.status)) {
      const userSets = [];
      const userValues = [old.account_id];
      if (input.name) { userValues.push(input.name); userSets.push(`name = $${userValues.length}`); }
      if (input.username) { userValues.push(input.username); userSets.push(`username = $${userValues.length}`); }
      if (input.status) { userValues.push(input.status === "active"); userSets.push(`active = $${userValues.length}`); }
      if (input.password) { userValues.push(await bcrypt.hash(input.password, 12)); userSets.push(`password_hash = $${userValues.length}`); }
      await client.query(`UPDATE users SET ${userSets.join(", ")} WHERE id = $1`, userValues);
    }
    const { rows } = await client.query("SELECT c.*, u.username FROM cashiers c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = $1", [id]);
    return rows[0];
  });
  res.json({ id: result.id, name: result.name, employeeId: result.employee_id, email: result.email, phone: result.phone, username: result.username, status: result.status, createdAt: result.created_at.toISOString().slice(0, 10) });
}));

router.delete("/cashiers/:id", allowRoles("admin"), asyncHandler(async (req, res) => {
  const result = await transaction(async (client) => {
    const { rows } = await client.query("SELECT user_id FROM cashiers WHERE id = $1 FOR UPDATE", [requireUuid(req.params.id)]);
    if (!rows[0]) throw new HttpError(404, "Cashier not found");
    await client.query("DELETE FROM cashiers WHERE id = $1", [req.params.id]);
    if (rows[0].user_id) await client.query("UPDATE users SET active = FALSE WHERE id = $1", [rows[0].user_id]);
  });
  res.status(204).end();
}));

router.get("/settings", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM school_settings WHERE id = 1");
  const row = rows[0];
  res.json({ schoolName: row.school_name, tagline: row.tagline, location: row.location, address: row.address, phone: row.phone, email: row.email, website: row.website, receiptFooter: row.receipt_footer, principal: row.principal });
}));

router.patch("/settings", allowRoles("admin"), asyncHandler(async (req, res) => {
  const input = z.object({ schoolName: z.string().trim().min(1).optional(), tagline: z.string().optional(), location: z.string().optional(), address: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), website: z.string().optional(), receiptFooter: z.string().optional(), principal: z.string().optional() }).parse(req.body);
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(input)) { values.push(value); sets.push(`${settingFields[key]} = $${values.length}`); }
  if (sets.length) await pool.query(`UPDATE school_settings SET ${sets.join(", ")}, updated_at = NOW() WHERE id = 1`, values);
  const { rows } = await pool.query("SELECT * FROM school_settings WHERE id = 1");
  const row = rows[0];
  res.json({ schoolName: row.school_name, tagline: row.tagline, location: row.location, address: row.address, phone: row.phone, email: row.email, website: row.website, receiptFooter: row.receipt_footer, principal: row.principal });
}));

router.get("/dashboard", asyncHandler(async (req, res) => {
  const year = req.query.academicYear;
  const params = year ? [year] : [];
  const yearFilterStudents = year ? "WHERE ay.name = $1" : "";
  const yearFilterPayments = year ? "WHERE ay.name = $1" : "";
  const [students, payments, classes] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM student_enrollments e JOIN academic_years ay ON ay.id = e.academic_year_id ${yearFilterStudents}`, params),
    pool.query(`SELECT COUNT(*)::int AS count, COALESCE(SUM(p.amount), 0) AS collected FROM payments p JOIN academic_years ay ON ay.id = p.academic_year_id ${yearFilterPayments}`, params),
    pool.query("SELECT COUNT(*)::int AS count FROM school_classes"),
  ]);
  const recent = await pool.query(
    `SELECT p.*, ay.name AS academic_year FROM payments p JOIN academic_years ay ON ay.id = p.academic_year_id
      ${yearFilterPayments} ORDER BY p.payment_date DESC, p.created_at DESC LIMIT 8`, params,
  );
  res.json({ studentCount: students.rows[0].count, paymentCount: payments.rows[0].count, collected: Number(payments.rows[0].collected), classCount: classes.rows[0].count, recentPayments: recent.rows.map(mapPayment) });
}));

router.get("/reports/fee-summary", asyncHandler(async (req, res) => {
  const year = req.query.academicYear;
  const values = year ? [year] : [];
  const filters = year ? "WHERE ay.name = $1" : "";
  const { rows } = await pool.query(
        `SELECT e.id, s.admission_no, s.student_id, s.first_name, s.last_name, e.class_name, e.section,
          COALESCE(fee.total, 0) AS fee_total, e.discount, COALESCE(paid.total, 0) AS paid_total
           FROM student_enrollments e JOIN students s ON s.id = e.student_id
           JOIN academic_years ay ON ay.id = e.academic_year_id
           LEFT JOIN LATERAL (
             SELECT SUM(fh.amount) AS total
               FROM fee_heads fh
             WHERE fh.structure_id IN (
                     SELECT efs.structure_id FROM student_enrollment_fee_structures efs
                      WHERE efs.enrollment_id = e.id
                   )
                AND (NOT EXISTS (
                       SELECT 1 FROM fee_head_applicability fha
                        WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
                     ) OR EXISTS (
                       SELECT 1 FROM fee_head_applicability fha
                        WHERE fha.structure_id = fh.structure_id AND fha.head_position = fh.position
                          AND fha.student_enrollment_id = e.id
                     ))
           ) fee ON TRUE
           LEFT JOIN LATERAL (SELECT SUM(amount) AS total FROM payments WHERE enrollment_id = e.id) paid ON TRUE
           ${filters} ORDER BY e.class_name, s.admission_no`, values,
  );
  res.json(rows.map((row) => {
    const payable = Math.max(Number(row.fee_total) - Number(row.discount), 0);
    const paid = Number(row.paid_total);
    return { studentId: row.id, admissionNo: row.admission_no, studentCode: row.student_id, studentName: `${row.first_name} ${row.last_name}`.trim(), className: row.class_name, section: row.section, payable, paid, balance: Math.max(payable - paid, 0), status: paid >= payable ? "Paid" : paid > 0 ? "Partial" : "Pending" };
  }));
}));

router.get("/reports/collections", asyncHandler(async (req, res) => {
  const values = [];
  const where = req.query.academicYear ? (values.push(req.query.academicYear), "WHERE ay.name = $1") : "";
  const { rows } = await pool.query(
    `SELECT p.payment_date AS date, p.mode, COUNT(*)::int AS count, SUM(p.amount) AS amount
       FROM payments p JOIN academic_years ay ON ay.id = p.academic_year_id ${where}
      GROUP BY p.payment_date, p.mode ORDER BY p.payment_date`, values,
  );
  res.json(rows.map((row) => ({ date: dateString(row.date), mode: row.mode, count: row.count, amount: Number(row.amount) })));
}));

export default router;
