import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forge-cal.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ForgeCal | Scheduling API Platform",
    template: "%s | ForgeCal",
  },
  description: "Calendly-style scheduling infrastructure with Google Meet, APIs, webhooks, and client access controls.",
  applicationName: "ForgeCal",
  keywords: ["Calendly alternative", "scheduling API", "Google Meet booking", "booking system", "ForgeCal"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "ForgeCal | Scheduling API Platform",
    description: "Sell scheduling as a service with client dashboards, API keys, and Google Calendar automation.",
    url: "/",
    siteName: "ForgeCal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ForgeCal | Scheduling API Platform",
    description: "API-first booking infrastructure for agencies and service teams.",
  },
  verification: {
    google: "IwOVQ2k9hHs1LJfu9rgwkTdDtZNWdYFC7KOOoIhPThY",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
