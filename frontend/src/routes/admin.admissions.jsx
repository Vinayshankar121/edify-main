import { createFileRoute } from "@tanstack/react-router";
import { AdmissionsPage } from "@/pages/AdmissionsPage";

function AdmissionsRoute() {
  const { edit } = Route.useSearch();
  return <AdmissionsPage key={edit ?? "new"} editId={edit} />;
}

export const Route = createFileRoute("/admin/admissions")({
  validateSearch: (search) => ({ edit: typeof search.edit === "string" ? search.edit : undefined }),
  head: () => ({ meta: [{ title: "Admissions — NR Edify English Medium School" }] }),
  component: AdmissionsRoute,
});
