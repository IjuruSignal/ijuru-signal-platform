import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ijuru Signal | Climate Evidence & Field Verification for Rwanda",
  description:
    "District-level weather forecasts, historical rainfall anomalies, satellite vegetation context, and human field verification across all 30 districts of Rwanda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSerif.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-[#f3f4ee] text-[#132e36] antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#132e36",
              color: "#f3f4ee",
              border: "1px solid #2b5864",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
