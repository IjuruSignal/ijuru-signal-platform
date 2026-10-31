import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ijuru Signal | Climate evidence concept", description: "A proposed climate evidence and field-verification workspace for Rwanda." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
