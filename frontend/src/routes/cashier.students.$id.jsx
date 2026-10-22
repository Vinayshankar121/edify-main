import { createFileRoute } from "@tanstack/react-router";
import { StudentProfile } from "@/pages/StudentProfile";

function CashierStudentProfileRoute() {
  return <StudentProfile id={Route.useParams().id} base="/cashier" />;
}

export const Route = createFileRoute("/cashier/students/$id")({
  head: () => ({ meta: [{ title: "Student Profile — NR Edify English Medium School" }] }),
  component: CashierStudentProfileRoute,
});
