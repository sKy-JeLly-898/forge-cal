import Link from "next/link";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

const plans = [
  {
    name: "Starter",
    monthly: "$0",
    yearly: "$0",
    subtitle: "Free tier for pilot clients",
    features: ["1 API key", "Core booking APIs", "Request-based approval required", "Community support"],
    cta: "Request Access",
    href: "mailto:forgeweb90@gmail.com?subject=ForgeCal Starter Access Request",
  },
  {
    name: "Growth",
    monthly: "$10",
    yearly: "$96",
    subtitle: "For small agencies and service teams",
    features: ["Up to 5 API keys", "Use across 5 client sites", "3 months setup support", "Webhook + Google Meet flow"],
    cta: "Buy Growth",
    href: "mailto:forgeweb90@gmail.com?subject=ForgeCal Growth Plan",
  },
  {
    name: "Scale",
    monthly: "$25",
    yearly: "$240",
    subtitle: "For multi-brand and high-volume usage",
    features: ["Unlimited API keys", "Unlimited site integrations", "6-8 months priority support", "Advanced lifecycle webhooks"],
    cta: "Buy Scale",
    href: "mailto:forgeweb90@gmail.com?subject=ForgeCal Scale Plan",
  },
] as const;

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 md:px-6 md:pt-12">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
  <Calendar className="h-5 w-5 text-white" />
</div>
            <p className="text-lg font-semibold text-slate-900">ForgeCal</p>
          </div>
          {session?.user ? (
            <Button asChild>
              <Link href={session.user.role === "SUPER_ADMIN" ? "/dashboard" : "/client/dashboard"}>Dashboard</Link>
            </Button>
          ) : null}
        </header>

        <div className="space-y-6 text-center md:text-left">
          <Badge>Calendar API Platform</Badge>
          <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
            Launch a branded booking system your clients can actually afford.
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-600 md:mx-0">
            ForgeCal gives agencies and service teams Calendly-style scheduling, API access, Google Meet generation, and
            webhooks at a lower cost.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            <Button asChild size="lg">
              <a href="#pricing">See Pricing</a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:forgeweb90@gmail.com?subject=ForgeCal Demo Request">Book Demo</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold text-slate-900">Simple pricing that stays cheap</h2>
          <p className="mt-2 text-slate-600">Yearly plans include 20% discount compared to monthly billing.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.name} className="border-slate-300 bg-white/95">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-semibold text-slate-900">{plan.monthly}</p>
                  <p className="text-sm text-slate-500">per month</p>
                </div>
                <div className="rounded-md bg-slate-100 p-2 text-sm text-slate-700">
                  <span className="font-medium">{plan.yearly}</span> yearly billing
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full">
                  <a href={plan.href}>{plan.cta}</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Built for API Sales</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Generate and revoke API keys per client so paid access is always in your control.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Meeting-Ready by Default</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Confirmed bookings auto-create Google Calendar events and Google Meet links.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Friendly</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Frontends only need your API key and slug to render availability and booking forms.
            </CardContent>
          </Card>
        </div>
      </section>

      {!session?.user ? (
        <section className="mx-auto max-w-6xl px-4 pb-20 md:px-6">
          <Card className="border-slate-300">
            <CardHeader>
              <CardTitle>Need internal dashboard access?</CardTitle>
              <CardDescription>
                Dashboard sign-in is restricted to approved operator emails only. Contact your ForgeCal admin.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      ) : null}

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-10 text-sm text-slate-600 md:px-6">
        <p>ForgeCal by ForgeWeb</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy-policy" className="underline">
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" className="underline">
            Terms of Service
          </Link>
          <a href="mailto:forgeweb90@gmail.com" className="underline">
            Contact
          </a>
        </div>
      </footer>
    </main>
  );
}
