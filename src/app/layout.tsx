import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindLedger - Track Your Goals & Progress",
  description: "Track your learning progress and achieve your goals with MindLedger. Build consistent habits and monitor your achievements.",
  keywords: ["MindLedger", "goals", "progress", "tracking", "learning", "habits"],
  authors: [{ name: "MindLedger" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "MindLedger - Track Your Goals & Progress",
    description: "Track your learning progress and achieve your goals with MindLedger.",
    siteName: "MindLedger",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MindLedger - Track Your Goals & Progress",
    description: "Track your learning progress and achieve your goals with MindLedger.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
