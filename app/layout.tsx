import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "이음 EEUM — 한일 진지한 관계 매칭";
const description = "관계 목적, 가치관, 생활 방식과 한일 국제연애 현실을 함께 보는 적응형 궁합 진단.";
const productionUrl = "https://eeumdating.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(productionUrl),
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
