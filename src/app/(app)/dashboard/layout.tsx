import { redirect } from "next/navigation";

import { auth } from "@/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/forge-entry-x9q7m2k");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/client/dashboard");
  }

  return <>{children}</>;
}
