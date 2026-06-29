import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";
import Nav from "@/components/shell/Nav";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./providers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Oath — The Ledger Court",
  description: "Promises with consequences. Public accountability judged by GenLayer validators.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-oath-black text-ivory-record">
        <WalletProvider>
          <Providers>
            <Nav />
            <main className="pt-14">{children}</main>
            <Toaster position="bottom-right" theme="dark" />
          </Providers>
        </WalletProvider>
      </body>
    </html>
  );
}
