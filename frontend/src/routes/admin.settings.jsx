import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/pages/AdminConfigPages";
export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "School Settings — NR Edify English Medium School" }] }),
  component: SettingsPage,
});
