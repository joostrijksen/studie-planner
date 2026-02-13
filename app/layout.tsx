import type { Metadata } from "next";
import "./globals.css";
import PWARegister from './PWARegister';

export const metadata: Metadata = {
  title: "Studie Planner - Lars",
  description: "Slimme studieplanning voor Lars",
  manifest: '/manifest.json',
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}