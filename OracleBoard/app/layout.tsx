import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/context/WalletContext";

export const metadata: Metadata = {
  title: "OracleBoard — Decentralized Startup Investment Committee",
  description:
    "OracleBoard is a GenLayer-native startup evaluation platform where founders submit dossiers and GenLayer consensus produces transparent investment memos and committee recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-obsidian text-memo font-body">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
