import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/forge-entry-x9q7m2k");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      clientAccount: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/");
  }

  if (user.role === "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  let linkedClientAccount = user.clientAccount;

  // Repair missing link after first OAuth sign-in by matching active client account on email.
  if (!linkedClientAccount && user.email) {
    const matched = await prisma.clientAccount.findUnique({
      where: { email: user.email.toLowerCase() },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (matched?.isActive) {
      await prisma.clientAccount.update({
        where: { id: matched.id },
        data: {
          userId: user.id,
        },
      });
      linkedClientAccount = matched;
    }
  }

  if (!linkedClientAccount?.isActive) {
    redirect("/");
  }

  return <>{children}</>;
}
