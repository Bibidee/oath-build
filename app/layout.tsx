import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";
import Nav from "@/components/shell/Nav";
import { Toaster } from "@/components/ui/sonner";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Oath — The Ledger Court",
  description: "Promises with consequences. Public accountability judged by GenLayer validators.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-ink text-parchment">
        <WalletProvider>
          <Providers>
            <Nav />
            <main className="pt-16">{children}</main>
            <Toaster position="bottom-right" theme="dark" />
          </Providers>
        </WalletProvider>
      </body>
    </html>
  );
}
