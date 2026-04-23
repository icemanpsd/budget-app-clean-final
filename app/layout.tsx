import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Budget App",
  description: "Family budget app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}