import { COLLECTIONS, useCollection } from "@/lib/store";
export const useStudents = () => useCollection(COLLECTIONS.students, []);
export const usePayments = () => useCollection(COLLECTIONS.payments, []);
export const useClasses = () => useCollection(COLLECTIONS.classes, []);
export const useFeeStructures = () => useCollection(COLLECTIONS.feeStructures, []);
export const useFeeTerms = () => useCollection(COLLECTIONS.feeTerms, []);
export const useCashiers = () => useCollection(COLLECTIONS.cashiers, []);
export const useAcademicYears = () => useCollection(COLLECTIONS.academicYears, []);
export const useActiveYear = () => useCollection(COLLECTIONS.activeYear, "2025-2026");
export const useSettings = () =>
  useCollection(COLLECTIONS.settings, {
    schoolName: "NR Edify English Medium School",
    tagline: "Think Beyond",
    location: "Thikkonda",
    address: "",
    phone: "",
    email: "",
    website: "",
    receiptFooter: "",
    principal: "",
  });
export const uid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  // Some older Android browsers expose crypto but not randomUUID().
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
