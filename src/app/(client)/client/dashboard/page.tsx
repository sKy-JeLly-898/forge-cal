import { format } from "date-fns";

import { auth } from "@/auth";
import {
  createClientApiKeyAction,
  createClientEventTypeAction,
  createClientWebhookAction,
  revokeClientApiKeyAction,
} from "@/app/(client)/client/dashboard/actions";
import { SignOutButton } from "@/app/(app)/dashboard/signout-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBilling, PLAN_CONFIG } from "@/lib/plans";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboardPage() {
  const session = await auth();

  const [clientAccount, apiKeys, bookings, eventTypes, webhooks] = await Promise.all([
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
    prisma.webhookEndpoint.findMany({
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
          <CardTitle>Create Event Type</CardTitle>
          <CardDescription>Create your own meeting type and timezone. Default availability is Mon-Fri, 9:00-17:00.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createClientEventTypeAction} className="grid gap-3 md:grid-cols-2">
            <input name="name" required placeholder="Strategy call" className="h-10 rounded-md border border-slate-300 px-3 text-sm md:col-span-2" />
            <input
              name="timezone"
              required
              defaultValue="UTC"
              placeholder="America/New_York"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <input
              name="durationMinutes"
              required
              type="number"
              min={15}
              max={180}
              defaultValue={30}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <input
              name="slotIntervalMin"
              required
              type="number"
              min={15}
              max={120}
              defaultValue={30}
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
            />
            <textarea
              name="description"
              placeholder="What this meeting is about"
              className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
            <div className="md:col-span-2">
              <Button type="submit">Create Event Type</Button>
            </div>
          </form>
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
          <CardDescription>Your active meeting types available for public booking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {eventTypes.length === 0 ? <p className="text-sm text-slate-500">No active event types yet.</p> : null}
          {eventTypes.map((eventType) => (
            <div key={eventType.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{eventType.name}</p>
                  <p className="font-mono text-xs text-slate-500">slug: {eventType.slug}</p>
                  <p className="text-xs text-slate-500">timezone: {eventType.timezone}</p>
                </div>
                <Badge>active</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Add your webhook URL only. ForgeCal auto-generates a secret key for you; copy that secret into your receiving app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={createClientWebhookAction} className="flex gap-3">
            <input
              name="url"
              type="url"
              required
              placeholder="https://your-site.com/api/forgecal-webhook"
              className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm"
            />
            <Button type="submit">Add Webhook</Button>
          </form>
          <div className="space-y-3">
            {webhooks.length === 0 ? <p className="text-sm text-slate-500">No webhooks configured.</p> : null}
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="rounded-md border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-800">{webhook.url}</p>
                <p className="mt-1 font-mono text-xs text-slate-500">secret: {webhook.secret}</p>
              </div>
            ))}
          </div>
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
