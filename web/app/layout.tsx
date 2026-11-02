import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "一码收 · 扫码收文件",
  description: "作业、打印资料、日常文件，一码收好。扫码上传、独立收件、一键打包。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
