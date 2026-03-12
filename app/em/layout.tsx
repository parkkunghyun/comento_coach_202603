import { DashboardShell } from "@/components/DashboardShell";

export default function EMLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell user={{ name: "EM", email: "" }}>
      {children}
    </DashboardShell>
  );
}
