import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | ForgeCal",
  description: "Privacy policy for ForgeCal scheduling platform",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 md:px-6">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Privacy Policy</h1>
        <Link href="/" className="text-sm text-emerald-700 underline">
          Back to home
        </Link>
      </div>

      <div className="space-y-6 text-sm leading-7 text-slate-700">
        <p>
          <strong>Effective date:</strong> February 18, 2026
        </p>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">1. Who We Are</h2>
          <p>
            ForgeCal is a scheduling product operated by ForgeWeb. This policy explains how we collect, use, and protect
            personal data when users access ForgeCal websites, APIs, and dashboards.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">2. Data We Collect</h2>
          <p>We may collect and process the following information:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account data: name, email, and profile image from Google sign-in.</li>
            <li>Calendar data: free/busy information and event details needed for scheduling.</li>
            <li>Booking data: guest name, guest email, meeting time, timezone, and optional message.</li>
            <li>Operational data: API keys, webhook endpoints, request logs, and usage analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">3. Google User Data</h2>
          <p>
            ForgeCal uses Google OAuth and Google Calendar APIs to provide availability lookup, event creation, and meeting
            link generation. Google user data is used only to deliver requested scheduling functionality.
          </p>
          <p>
            We do not sell Google user data. We do not use Google user data for advertising. We do not transfer Google user
            data to third parties except as required to deliver service functionality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">4. Why We Process Data</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Authenticate users and secure access to dashboards.</li>
            <li>Display appointment availability and process bookings.</li>
            <li>Create and update calendar events and meeting links.</li>
            <li>Send booking confirmation/cancellation emails.</li>
            <li>Provide support, billing, abuse prevention, and reliability monitoring.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">5. Data Sharing</h2>
          <p>We share data only with infrastructure/service providers needed to operate ForgeCal, such as:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Neon (database hosting)</li>
            <li>Google APIs (calendar and authentication)</li>
            <li>Resend or configured email provider (transactional messages)</li>
            <li>Vercel (application hosting)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">6. Data Retention</h2>
          <p>
            We retain data for as long as needed to provide service and meet legal or contractual obligations. Clients may
            request deactivation or deletion of accounts, API keys, and related data subject to operational and legal limits.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">7. Security</h2>
          <p>
            We use reasonable administrative and technical controls to protect data, including access restrictions and secure
            transmission practices. No method of storage or transmission is guaranteed to be 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">8. Your Rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, or delete personal data. Contact us to submit
            a request.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
          <p>
            For privacy questions or requests, contact: <a className="underline" href="mailto:forgeweb90@gmail.com">forgeweb90@gmail.com</a>
          </p>
        </section>
      </div>
    </main>
  );
}
