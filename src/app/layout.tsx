import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/app-context";
import { ToastProvider } from "@/components/ui/toast";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "St. Joseph Village 6 Phase 4 — Homeowners Masterlist",
  description: "Official Homeowners Association Registry and Resident Information System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 dark:bg-[#060c18] font-sans transition-colors duration-200">
        <AppProvider>
          <ToastProvider>{children}</ToastProvider>
        </AppProvider>
        <Analytics />
      </body>
    </html>
  );
}
