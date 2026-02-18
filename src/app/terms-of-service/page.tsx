import Link from "next/link";

export const metadata = {
  title: "Terms of Service | ForgeCal",
  description: "Terms of service for ForgeCal scheduling platform",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Terms of Service</h1>
        <Link href="/" className="text-sm text-emerald-700 underline">
          Back to home
        </Link>
      </div>

      <div className="space-y-6 text-sm leading-7 text-slate-700">
        <p>
          <strong>Effective date:</strong> February 18, 2026
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Agreement</h2>
          <p>
            By accessing or using ForgeCal, you agree to these Terms of Service. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Service Scope</h2>
          <p>
            ForgeCal provides scheduling APIs, booking workflows, dashboard controls, Google Calendar integration, and webhook
            delivery. Features may evolve over time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Accounts And Access</h2>
          <p>
            Access is role-based (Super Admin / Client). You are responsible for maintaining account and API key security and
            for all activity under your credentials.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Pricing And Plans</h2>
          <p>ForgeCal currently offers Starter, Growth, and Scale plans with monthly and yearly billing variants.</p>
          <p>
            Plan limits (including API key limits, support windows, and active status) are controlled by ForgeCal Super
            Admin and may be updated based on your subscription status.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Acceptable Use</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Do not misuse APIs, attempt unauthorized access, or disrupt service operations.</li>
            <li>Do not use ForgeCal for unlawful, abusive, or deceptive activity.</li>
            <li>Do not resell access beyond your approved plan without written authorization.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Google Integration Terms</h2>
          <p>
            Use of Google APIs through ForgeCal is subject to Google policies and your accepted Google account permissions.
            You can revoke OAuth permissions in your Google account at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Availability And Support</h2>
          <p>
            We aim to keep services available and reliable but do not guarantee uninterrupted operation. Support levels depend
            on your subscribed plan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Suspension And Termination</h2>
          <p>
            We may suspend or terminate access for non-payment, policy violations, security concerns, or abuse. Super Admin
            may revoke API keys and client access at any time.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Limitation Of Liability</h2>
          <p>
            ForgeCal is provided on an &quot;as is&quot; basis to the extent permitted by law. We are not liable for indirect,
            incidental, or consequential damages arising from service use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">10. Changes To Terms</h2>
          <p>
            We may update these terms from time to time. Continued use after updates means you accept the revised terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">11. Contact</h2>
          <p>
            For terms, billing, or support: <a className="underline" href="mailto:forgeweb90@gmail.com">forgeweb90@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
