import { redirect } from "next/navigation";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  redirect("/em");
}
