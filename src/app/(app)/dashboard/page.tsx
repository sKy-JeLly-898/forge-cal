import { format, subDays } from "date-fns";

import {
  createClientAccountAction,
  revokeApiKeyAction,
  toggleClientAccountStatusAction,
  updateClientPlanAction,
} from "@/app/(app)/dashboard/actions";
import { auth } from "@/auth";
import { SignOutButton } from "@/app/(app)/dashboard/signout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBilling, PLAN_CONFIG } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [apiKeys, bookings, clientAccounts] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId: session!.user.id, revokedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.booking.findMany({
      where: { hostUserId: session!.user.id },
      include: { eventType: true },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    prisma.clientAccount.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const clientUserIds = clientAccounts.map((account) => account.userId).filter((id): id is string => Boolean(id));

  const [activeKeyCounts, totalKeyCounts, usageCounts] = await Promise.all([
    prisma.apiKey.groupBy({
      by: ["userId"],
      where: { userId: { in: clientUserIds }, revokedAt: null },
      _count: { _all: true },
    }),
    prisma.apiKey.groupBy({
      by: ["userId"],
      where: { userId: { in: clientUserIds } },
      _count: { _all: true },
    }),
    prisma.apiRequestLog.groupBy({
      by: ["userId"],
      where: { userId: { in: clientUserIds }, createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  const activeKeyCountMap = new Map(activeKeyCounts.map((item) => [item.userId, item._count._all]));
  const totalKeyCountMap = new Map(totalKeyCounts.map((item) => [item.userId, item._count._all]));
  const usageCountMap = new Map(usageCounts.map((item) => [item.userId, item._count._all]));

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ForgeCal Super Admin</h1>
          <p className="text-sm text-slate-600">Control client subscriptions, access, and API limits from one place.</p>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Create Or Approve Client Account</CardTitle>
          <CardDescription>Grant dashboard access and assign plan limits for each client.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createClientAccountAction} className="grid gap-3 md:grid-cols-4">
            <input
              name="companyName"
              required
              placeholder="Company name"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="client@company.com"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <select name="planTier" className="h-10 rounded-md border border-slate-300 px-3 text-sm" defaultValue="STARTER">
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="SCALE">Scale</option>
            </select>
            <select
              name="billingCycle"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              defaultValue="MONTHLY"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
            <div className="md:col-span-4">
              <Button type="submit">Create / Update Client</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Client Accounts</CardTitle>
          <CardDescription>Clients can sign in only if active in this list.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {clientAccounts.length === 0 ? <p className="text-sm text-slate-500">No clients yet.</p> : null}
          {clientAccounts.map((account) => {
            const config = PLAN_CONFIG[account.planTier];
            const activeKeyCount = account.userId ? (activeKeyCountMap.get(account.userId) ?? 0) : 0;
            const totalKeyCount = account.userId ? (totalKeyCountMap.get(account.userId) ?? 0) : 0;
            const usage30d = account.userId ? (usageCountMap.get(account.userId) ?? 0) : 0;
            return (
              <div key={account.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{account.companyName}</p>
                    <p className="text-sm text-slate-600">{account.email}</p>
                    <p className="text-xs text-slate-500">
                      linked user: {account.user?.email ?? "not linked yet"} | support {account.supportMonths} months
                    </p>
                  </div>
                  <Badge variant={account.isActive ? "default" : "destructive"}>{account.isActive ? "active" : "disabled"}</Badge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <form action={updateClientPlanAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="clientAccountId" value={account.id} />
                    <select name="planTier" defaultValue={account.planTier} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
                      <option value="STARTER">Starter</option>
                      <option value="GROWTH">Growth</option>
                      <option value="SCALE">Scale</option>
                    </select>
                    <select name="billingCycle" defaultValue={account.billingCycle} className="h-9 rounded-md border border-slate-300 px-2 text-sm">
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Update Plan
                    </Button>
                  </form>

                  <form action={toggleClientAccountStatusAction} className="justify-self-start md:justify-self-end">
                    <input type="hidden" name="clientAccountId" value={account.id} />
                    <Button type="submit" size="sm" variant="outline">
                      {account.isActive ? "Disable Access" : "Enable Access"}
                    </Button>
                  </form>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {config.label} {formatBilling(account.billingCycle)} | {account.maxApiKeys ?? "Unlimited"} API keys | {account.siteLimit ?? "Unlimited"} sites
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  API keys made: {totalKeyCount} | Active keys: {activeKeyCount} | API calls (30d): {usage30d}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin API Keys</CardTitle>
          <CardDescription>Internal keys for super admin operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {apiKeys.length === 0 ? <p className="text-sm text-slate-500">No admin API keys.</p> : null}
          {apiKeys.map((key) => (
            <div key={key.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{key.label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-slate-600">{key.token}</p>
                </div>
                <form action={revokeApiKeyAction}>
                  <input type="hidden" name="apiKeyId" value={key.id} />
                  <Button type="submit" size="sm" variant="outline">
                    Revoke
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Bookings</CardTitle>
          <CardDescription>Latest bookings associated with the super admin account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? <p className="text-sm text-slate-500">No bookings yet.</p> : null}
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-800">{booking.eventType.name}</p>
              <p className="text-slate-600">
                {booking.guestName} ({booking.guestEmail})
              </p>
              <p className="text-slate-500">{format(booking.startTime, "PPP p")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
