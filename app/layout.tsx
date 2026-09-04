import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { TopNav } from "@/components/layout/top-nav";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ulearn-it.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ulearn/systems",
  description:
    "Interactive system architecture demonstrations — load balancers, rate limiters, message queues, and RabbitMQ vs Kafka. Watch each mechanism run live, tweak it, break it on purpose.",
  verification: {
    google: "qOFMEPup7MBZiXSACACJJnAz9nus8bYn5TIZiM1CkyA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript()}
        </Script>
        <TopNav />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
