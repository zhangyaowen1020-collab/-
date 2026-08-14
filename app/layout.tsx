import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "一手 AI 换衣工作台",
  description: "跨设备任务与人工 Codex 交接工作台",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
