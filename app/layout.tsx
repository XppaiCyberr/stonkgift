import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "StonkGift — Programmable Stock Gifting on Base",
  description: "Deposit tokenized stocks into a smart contract and gift them with a time-locked unlock date on Base.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-blue-600 selection:text-white">
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
              {children}
            </main>
            <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-400">
              <p>StonkGift — Programmable Tokenized Stock Gifts on Base</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
