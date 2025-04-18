import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { Toaster } from "@/components/ui/toaster";
import TouchEventFixer from "./components/global/TouchEventFixer";
import { SWRProvider } from "@/lib/swr-provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LunchLab",
  description: "점심 메뉴 관리 앱",
};

export default function RootLayout({
  children,
  admin,
  invitations,
}: Readonly<{
  children: React.ReactNode;
  admin?: React.ReactNode;
  invitations?: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
      localization={koKR}
      appearance={{
        elements: {
          formButtonPrimary: "bg-primary hover:bg-primary/90",
        }
      }}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      <html lang="ko">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SWRProvider>
            <NavbarWrapper />
            <main>
              {children}
              {/* 병렬 라우트 슬롯 - 현재 활성화된 탭만 보이도록 설정 (hidden) */}
              <div id="admin-tab" className="hidden">{admin}</div>
              <div id="invitations-tab" className="hidden">{invitations}</div>
            </main>
            <Toaster />
            <TouchEventFixer />
          </SWRProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
