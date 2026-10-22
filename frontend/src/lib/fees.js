export const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const fullName = (s) => `${s.firstName} ${s.lastName}`;
export const structureTotal = (s) => (s ? s.heads.reduce((t, h) => t + h.amount, 0) : 0);
export const studentFeeHeads = (structure, studentId) =>
  structure?.heads.filter(
    (head) => !head.optional || (studentId && head.studentIds?.includes(studentId)),
  ) ?? [];
export const studentFeeTotal = (structure, studentId) =>
  (Array.isArray(structure) ? structure : [structure]).reduce(
    (total, item) =>
      total + studentFeeHeads(item, studentId).reduce((sum, head) => sum + head.amount, 0),
    0,
  );
export const requiredFeeTotal = (structure) =>
  structure?.heads
    .filter((head) => !head.optional)
    .reduce((total, head) => total + head.amount, 0) ?? 0;
export function feeSummary(student, structures, payments) {
  const structureIds = student.structureIds?.length
    ? student.structureIds
    : student.structureId
      ? [student.structureId]
      : [];
  const assignedStructures = structures.filter((structure) => structureIds.includes(structure.id));
  const total = studentFeeTotal(assignedStructures, student.id);
  const discount = student.discount || 0;
  const payable = Math.max(total - discount, 0);
  const paid = payments.filter((p) => p.studentId === student.id).reduce((t, p) => t + p.amount, 0);
  const balance = Math.max(payable - paid, 0);
  const status = paid <= 0 ? "Pending" : balance <= 0 ? "Paid" : "Partial";
  return { total, discount, payable, paid, balance, status };
}
export function headBreakdown(student, structures, payments) {
  const structureIds = student.structureIds?.length
    ? student.structureIds
    : student.structureId
      ? [student.structureId]
      : [];
  const assignedStructures = structures.filter((structure) => structureIds.includes(structure.id));
  if (!assignedStructures.length) return [];
  const heads = assignedStructures.flatMap((structure) =>
    studentFeeHeads(structure, student.id).map((head, index) => ({
      key: `${structure.id}:${head.position ?? index}`,
      structureId: structure.id,
      position: head.position ?? index,
      name: head.name,
      structureName: structure.name,
      amount: head.amount,
      paid: 0,
      balance: head.amount,
    })),
  );
  let discount = student.discount || 0;
  for (const head of heads) {
    const appliedDiscount = Math.min(head.balance, discount);
    head.balance -= appliedDiscount;
    discount -= appliedDiscount;
  }
  const studentPayments = payments
    .filter((payment) => payment.studentId === student.id)
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) || left.receiptNo.localeCompare(right.receiptNo),
    );
  for (const payment of studentPayments) {
    if (payment.feeHeads?.length) {
      for (const allocation of payment.feeHeads) {
        const head = heads.find(
          (item) =>
            item.structureId === allocation.structureId &&
            item.position === Number(allocation.position),
        );
        if (!head) continue;
        const applied = Math.min(head.balance, Number(allocation.amount));
        head.paid += applied;
        head.balance -= applied;
      }
    } else {
      let remaining = payment.amount;
      for (const head of heads) {
        const applied = Math.min(head.balance, remaining);
        head.paid += applied;
        head.balance -= applied;
        remaining -= applied;
        if (remaining <= 0) break;
      }
    }
  }
  return heads;
}
// Payment dates are calendar dates in the school's local timezone. Avoid UTC
// conversion here: after midnight UTC, `toISOString()` would return yesterday
// for users in India and hide today's collections from the dashboard.
export const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
export function nextReceiptNo(payments) {
  const max = payments.reduce((m, p) => {
    const n = Number(p.receiptNo.split("-").pop());
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `ED-2026-${String(max + 1).padStart(4, "0")}`;
}
export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};
export function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join(
    "\n",
  );
}
export function downloadCsv(filename, rows) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
