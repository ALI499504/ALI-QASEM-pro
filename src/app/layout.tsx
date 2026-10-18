import type { Metadata } from "next";
import { Cairo, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "M.ROBOT | AI Gold Trading Bot 2026",
  description:
    "منصة تداول الذهب بالذكاء الاصطناعي — تحليل لحظي لزوج (XAUUSD) مع إشارات مؤكدة، مؤشرات فنية متقدمة، ولوحة تحكم احترافية لعام 2026.",
  keywords: [
    "M.ROBOT",
    "تداول الذهب",
    "روبوت تداول",
    "ذكاء اصطناعي",
    "XAUUSD",
    "تحليل فني",
    "إشارات تداول",
  ],
  authors: [{ name: "M.ROBOT" }],
  manifest: "/manifest.json",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
    apple: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "M.ROBOT",
  },
  openGraph: {
    title: "M.ROBOT 2026",
    description: "تداول الذهب بالذكاء الاصطناعي — إشارات مؤكدة لحظية",
    type: "website",
    images: ["https://z-cdn.chatglm.cn/z-ai/static/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${jetMono.variable} antialiased bg-background text-foreground`}
      >
        <I18nProvider>
          {children}
        </I18nProvider>
        <Toaster />
        <SonnerToaster position="top-center" />
      </body>
    </html>
  );
}
