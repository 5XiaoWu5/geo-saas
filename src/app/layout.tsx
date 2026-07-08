import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import { WorkspaceProvider } from "@/features/workspace";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GeoPilot AI",
  description: "Enterprise GEO AI SaaS platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <I18nProvider><WorkspaceProvider>{children}</WorkspaceProvider></I18nProvider>
      </body>
    </html>
  );
}

