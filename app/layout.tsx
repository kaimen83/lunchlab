import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import TouchEventFixer from "./components/global/TouchEventFixer";
import "./globals.css";

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
}: Readonly<{
  children: React.ReactNode;
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
          <Navbar />
          <main>{children}</main>
          <Toaster />
          <TouchEventFixer />
        </body>
      </html>
    </ClerkProvider>
  );
}
