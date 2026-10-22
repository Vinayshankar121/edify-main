import { createFileRoute } from "@tanstack/react-router";
import { StudentProfile } from "@/pages/StudentProfile";

function AdminStudentProfileRoute() {
  return <StudentProfile id={Route.useParams().id} base="/admin" />;
}

export const Route = createFileRoute("/admin/students/$id")({
  head: () => ({ meta: [{ title: "Student Profile — NR Edify English Medium School" }] }),
  component: AdminStudentProfileRoute,
});
