import { createFileRoute } from "@tanstack/react-router";
import { StudentsPage } from "@/pages/StudentsPage";

function CashierStudentsRoute() {
  const { q } = Route.useSearch();
  return <StudentsPage key={q ?? ""} base="/cashier" initialQuery={q ?? ""} />;
}

export const Route = createFileRoute("/cashier/students/")({
  validateSearch: (search) => ({ q: typeof search.q === "string" ? search.q : undefined }),
  head: () => ({ meta: [{ title: "Students — NR Edify English Medium School" }] }),
  component: CashierStudentsRoute,
});
