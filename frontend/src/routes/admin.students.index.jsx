import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/pages/StudentsPage";

function AdminStudentsRoute() {
  const { q } = Route.useSearch();
  return <StudentsPage key={q ?? ""} base="/admin" initialQuery={q ?? ""} />;
}

export const Route = createFileRoute("/admin/students/")({
  validateSearch: (search) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  head: () => ({ meta: [{ title: "Students — NR Edify English Medium School" }] }),
  component: AdminStudentsRoute,
});
