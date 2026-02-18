import { format } from "date-fns";
import Link from "next/link";

import { auth } from "@/auth";
import { createClientApiKeyAction, revokeClientApiKeyAction } from "@/app/(client)/client/dashboard/actions";
import { SignOutButton } from "@/app/(app)/dashboard/signout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBilling, PLAN_CONFIG } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboardPage() {
  const session = await auth();

  const [clientAccount, apiKeys, bookings, eventTypes] = await Promise.all([
    prisma.clientAccount.findUnique({
      where: { userId: session!.user.id },
    }),
    prisma.apiKey.findMany({
      where: { userId: session!.user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { hostUserId: session!.user.id },
      include: { eventType: true },
      orderBy: { startTime: "asc" },
      take: 12,
    }),
    prisma.eventType.findMany({
      where: { userId: session!.user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!clientAccount) {
    return null;
  }

  const plan = PLAN_CONFIG[clientAccount.planTier];
  const keysRemaining = clientAccount.maxApiKeys === null ? "Unlimited" : Math.max(clientAccount.maxApiKeys - apiKeys.length, 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-8 md:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{clientAccount.companyName} Client Dashboard</h1>
          <p className="text-sm text-slate-600">Manage your API keys and integration details.</p>
        </div>
        <SignOutButton />
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Assigned by ForgeCal Super Admin</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Tier</p>
            <p className="font-medium text-slate-900">{plan.label}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Billing</p>
            <p className="font-medium text-slate-900">{formatBilling(clientAccount.billingCycle)}</p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">API Keys</p>
            <p className="font-medium text-slate-900">
              {apiKeys.length}/{clientAccount.maxApiKeys ?? "Unlimited"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Support Window</p>
            <p className="font-medium text-slate-900">{clientAccount.supportMonths} months</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>Create and revoke API keys for your approved websites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createClientApiKeyAction} className="flex gap-3">
            <input
              name="label"
              placeholder="Site label (ex: main marketing site)"
              className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm"
              required
            />
            <Button type="submit" disabled={clientAccount.maxApiKeys !== null && apiKeys.length >= clientAccount.maxApiKeys}>
              Create Key
            </Button>
          </form>
          <p className="text-xs text-slate-500">Remaining keys: {keysRemaining}</p>
          <div className="space-y-3">
            {apiKeys.length === 0 ? <p className="text-sm text-slate-500">No keys generated yet.</p> : null}
            {apiKeys.map((key) => (
              <div key={key.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{key.label}</p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-600">{key.token}</p>
                  </div>
                  <form action={revokeClientApiKeyAction}>
                    <input type="hidden" name="apiKeyId" value={key.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Revoke
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Endpoints</CardTitle>
          <CardDescription>Use these with your generated key in `x-api-key` header.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-slate-700">
          <p className="rounded-md bg-slate-100 p-2">GET /api/public/widget-config?slug=strategy-call</p>
          <p className="rounded-md bg-slate-100 p-2">GET /api/public/availability?slug=strategy-call&date=YYYY-MM-DD</p>
          <p className="rounded-md bg-slate-100 p-2">POST /api/public/bookings</p>
          <p className="rounded-md bg-slate-100 p-2">POST /api/public/bookings/BOOKING_ID/cancel</p>
          <p className="pt-2 text-slate-500">Need support? <a href="mailto:forgeweb90@gmail.com" className="underline">forgeweb90@gmail.com</a></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Event Types</CardTitle>
          <CardDescription>Create event types with your admin or ask support for setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventTypes.length === 0 ? <p className="text-sm text-slate-500">No active event types yet.</p> : null}
          {eventTypes.map((eventType) => (
            <div key={eventType.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{eventType.name}</p>
                  <p className="font-mono text-xs text-slate-500">slug: {eventType.slug}</p>
                </div>
                <Badge>active</Badge>
              </div>
            </div>
          ))}
          <Link href="mailto:forgeweb90@gmail.com?subject=Need event type setup" className="text-sm text-emerald-700 underline">
            Request event type configuration
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Your latest client-side booking traffic.</CardDescription>
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
