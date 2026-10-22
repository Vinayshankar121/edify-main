import { createFileRoute } from "@tanstack/react-router";
import { AcademicYearsPage } from "@/pages/AdminConfigPages";
export const Route = createFileRoute("/admin/academic-years")({
  head: () => ({ meta: [{ title: "Academic Years — NR Edify English Medium School" }] }),
  component: AcademicYearsPage,
});
