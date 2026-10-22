import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useFeeStructures, usePayments, useSettings, useStudents } from "@/hooks/useSchoolData";
import { feeSummary, fullName, headBreakdown, inr } from "@/lib/fees";
import { printDocument } from "@/lib/print";
export function ReceiptDocument({ payment }) {
  const { data: students } = useStudents();
  const { data: payments } = usePayments();
  const { data: structures } = useFeeStructures();
  const { data: settings } = useSettings();
  const st = students.find((s) => s.id === payment.studentId);
  // balances as of this payment
  const upto = payments.filter(
    (p) => p.studentId === payment.studentId && p.receiptNo <= payment.receiptNo,
  );
  const summary = st ? feeSummary(st, structures, upto) : null;
  const remaining = summary?.balance ?? 0;
  const previous = remaining + payment.amount;
  const heads = st ? headBreakdown(st, structures, upto) : [];
  return (
    <div
      className="receipt-document bg-card p-8 text-foreground"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="receipt-header flex items-center gap-4 border-b-2 border-primary pb-4">
        <img
          src="/favicon.jpeg"
          alt="NR Edify English Medium School"
          width={112}
          height={80}
          className="receipt-school-logo h-20 w-28 shrink-0 object-contain"
        />
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold uppercase tracking-wide">{settings.schoolName}</h2>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            {settings.location}
          </p>
          <p className="text-xs text-muted-foreground">
            {[settings.address, settings.phone, settings.email].filter(Boolean).join(" · ")}
          </p>
        </div>
        <img
          src="/edify-kids-logo.jpeg"
          alt="Edify Kids — The First Step"
          width={144}
          height={80}
          className="receipt-kids-logo h-20 w-36 shrink-0 object-contain"
        />
      </div>
      <div className="receipt-heading mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-lg font-bold uppercase">Fee Receipt</h3>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Receipt No: </span>
            <b>{payment.receiptNo}</b>
          </p>
          <p>
            <span className="text-muted-foreground">Date: </span>
            <b>{payment.date}</b>
          </p>
        </div>
      </div>
      <div className="receipt-student-details mt-4 grid grid-cols-2 gap-3 text-sm">
        <p>
          <span className="text-muted-foreground">Student: </span>
          <b>{st ? fullName(st) : "—"}</b>
        </p>
        <p>
          <span className="text-muted-foreground">Admission No: </span>
          <b>{st?.admissionNo}</b>
        </p>
        <p>
          <span className="text-muted-foreground">Class: </span>
          <b>{st?.className}</b>
        </p>
        <p>
          <span className="text-muted-foreground">Section: </span>
          <b>{st?.section}</b>
        </p>
        <p>
          <span className="text-muted-foreground">Academic Year: </span>
          <b>{payment.academicYear}</b>
        </p>
        <p>
          <span className="text-muted-foreground">Payment Mode: </span>
          <b>
            {payment.mode}
            {payment.reference ? ` (${payment.reference})` : ""}
          </b>
        </p>
      </div>
      <table className="receipt-table mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-secondary">
            <th className="border border-border p-2 text-left">Fee Head</th>
            <th className="border border-border p-2 text-right">Amount</th>
            <th className="border border-border p-2 text-right">Paid</th>
            <th className="border border-border p-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {heads.map((h) => (
            <tr key={h.key}>
              <td className="border border-border p-2">
                {h.structureName} · {h.name}
              </td>
              <td className="border border-border p-2 text-right">{inr(h.amount)}</td>
              <td className="border border-border p-2 text-right">{inr(h.paid)}</td>
              <td className="border border-border p-2 text-right">{inr(h.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-totals ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Previous Balance</span>
          <b>{inr(previous)}</b>
        </div>
        <div className="flex justify-between text-primary">
          <span>Current Payment</span>
          <b>{inr(payment.amount)}</b>
        </div>
        <div className="flex justify-between border-t border-border pt-1">
          <span>Remaining Balance</span>
          <b>{inr(remaining)}</b>
        </div>
      </div>
      {payment.remarks && (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">Remarks: </span>
          {payment.remarks}
        </p>
      )}
      <div className="receipt-signatures mt-12 flex items-end justify-between text-sm">
        <div>
          <p className="text-muted-foreground">Received by</p>
          <p className="font-semibold">{payment.cashierName}</p>
        </div>
        <div className="text-center">
          <div className="w-44 border-t border-foreground pt-1">Authorized Signature</div>
        </div>
      </div>
      <p className="receipt-footer mt-8 text-center text-xs text-muted-foreground">
        {settings.receiptFooter || "This is a computer generated receipt."}
      </p>
    </div>
  );
}
export function ReceiptDialog({ payment, onClose }) {
  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="no-print px-6 pt-6">
          <DialogTitle>Receipt {payment?.receiptNo}</DialogTitle>
        </DialogHeader>
        {payment && (
          <div id="print-root">
            <ReceiptDocument payment={payment} />
          </div>
        )}
        <div className="no-print flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={() => printDocument("receipt")}>
            <Download className="mr-2 size-4" /> Download (PDF)
          </Button>
          <Button onClick={() => printDocument("receipt")}>
            <Printer className="mr-2 size-4" /> Print receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
