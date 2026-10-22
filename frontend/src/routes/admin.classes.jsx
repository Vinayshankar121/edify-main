import { createFileRoute } from "@tanstack/react-router";
import { ClassesPage } from "@/pages/AdminConfigPages";
export const Route = createFileRoute("/admin/classes")({
  head: () => ({ meta: [{ title: "Classes & Sections — NR Edify English Medium School" }] }),
  component: ClassesPage,
});
