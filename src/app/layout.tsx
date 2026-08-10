import type { Metadata, Viewport } from "next";
import { Outfit, Fraunces } from "next/font/google";
import "./globals.css";

const body = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Corner Shop · Shift Scheduler",
  description: "Shared shift schedule and instant coverage alerts for student retail staff.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Shop Shifts",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6b5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
