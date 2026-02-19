import { format, formatDistanceToNow, subDays } from "date-fns";

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

  const [activeKeyCounts, totalKeyCounts, usageCounts, apiUsageLogs, clientApiKeys] = await Promise.all([
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
    prisma.apiRequestLog.findMany({
      where: {
        userId: { in: clientUserIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        userId: true,
        apiKeyId: true,
        originHost: true,
        refererHost: true,
        siteHint: true,
        endpoint: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.apiKey.findMany({
      where: { userId: { in: clientUserIds } },
      select: {
        id: true,
        userId: true,
        label: true,
      },
    }),
  ]);

  const activeKeyCountMap = new Map(activeKeyCounts.map((item) => [item.userId, item._count._all]));
  const totalKeyCountMap = new Map(totalKeyCounts.map((item) => [item.userId, item._count._all]));
  const usageCountMap = new Map(usageCounts.map((item) => [item.userId, item._count._all]));
  const apiKeyLabelMap = new Map(clientApiKeys.map((key) => [key.id, key.label]));

  const siteUsageByUser = new Map<string, Map<string, number>>();
  const latestUsageByUser = new Map<
    string,
    { site: string; endpoint: string; apiKeyLabel: string; createdAt: Date }
  >();

  for (const log of apiUsageLogs) {
    const site = log.siteHint || log.originHost || log.refererHost || "unknown";
    const userMap = siteUsageByUser.get(log.userId) ?? new Map<string, number>();
    userMap.set(site, (userMap.get(site) ?? 0) + 1);
    siteUsageByUser.set(log.userId, userMap);

    if (!latestUsageByUser.has(log.userId)) {
      latestUsageByUser.set(log.userId, {
        site,
        endpoint: log.endpoint,
        apiKeyLabel: apiKeyLabelMap.get(log.apiKeyId) ?? "unknown key",
        createdAt: log.createdAt,
      });
    }
  }

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
            const topSites = account.userId
              ? Array.from(siteUsageByUser.get(account.userId)?.entries() ?? [])
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 3)
              : [];
            const latestUsage = account.userId ? latestUsageByUser.get(account.userId) : null;
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
                <p className="mt-1 text-xs text-slate-500">
                  Sites using this API:{" "}
                  {topSites.length > 0 ? topSites.map(([site, count]) => `${site} (${count})`).join(", ") : "No source site data yet"}
                </p>
                {latestUsage ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Latest API hit: {latestUsage.site} {"->"} {latestUsage.endpoint} using key ({latestUsage.apiKeyLabel}){" "}
                    {formatDistanceToNow(latestUsage.createdAt, { addSuffix: true })}
                  </p>
                ) : null}
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
