import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BDG Trainer — тренажёр гамбита Блэкмара-Димера",
    template: "%s · BDG Trainer",
  },
  description:
    "Интерактивный шахматный тренажёр для изучения гамбита Блэкмара-Димера за белых: репертуар, ловушки, отработка вариантов и статистика прогресса.",
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
