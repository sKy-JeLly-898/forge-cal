import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function parseAllowlist(input?: string) {
  if (!input) {
    return [];
  }

  return input
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const adminAllowlist = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "database",
  },
  callbacks: {
    signIn: async ({ user }) => {
      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      if (adminAllowlist.includes(email)) {
        await prisma.user.updateMany({
          where: { email },
          data: { role: UserRole.SUPER_ADMIN },
        });
        return true;
      }

      const clientAccount = await prisma.clientAccount.findUnique({
        where: { email },
      });

      if (!clientAccount || !clientAccount.isActive) {
        return false;
      }

      const dbUser = await prisma.user.findFirst({
        where: { email },
      });

      if (dbUser) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { role: UserRole.CLIENT },
        });

        await prisma.clientAccount.update({
          where: { id: clientAccount.id },
          data: { userId: dbUser.id },
        });
      }

      return true;
    },
    session: async ({ session, user }) => {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, email: true },
        });
        session.user.id = user.id;
        session.user.role = dbUser?.role ?? "CLIENT";

        if (dbUser?.role === "CLIENT" && dbUser.email) {
          await prisma.clientAccount.updateMany({
            where: {
              email: dbUser.email.toLowerCase(),
              isActive: true,
            },
            data: {
              userId: user.id,
            },
          });
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/forge-entry-x9q7m2k",
  },
});
