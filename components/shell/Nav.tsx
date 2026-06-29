"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { shortAddr } from "@/lib/utils";
import { getExplorerContractUrl } from "@/lib/genlayer/client";

const links = [
  { href: "/oaths", label: "Ledger" },
  { href: "/arena", label: "Arena" },
  { href: "/receipts", label: "Receipts" },
  { href: "/create", label: "Create Oath" },
];

export default function Nav() {
  const pathname = usePathname();
  const { account, isConnected, connect, disconnect } = useWallet();

  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-glass-line bg-oath-black/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl text-ivory-record tracking-tight">Oath</span>
          <span className="font-mono text-xs text-ink-grey hidden sm:block">· The Ledger Court</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-mono text-sm transition-colors ${
                pathname.startsWith(l.href)
                  ? "text-ivory-record"
                  : "text-ink-grey hover:text-ivory-record"
              } ${l.href === "/create" ? "px-3 py-1.5 border border-witness-gold/40 text-witness-gold hover:bg-witness-gold/10 rounded-lg" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Wallet + contract status */}
        <div className="flex items-center gap-3">
          {hasContract && (
            <a
              href={getExplorerContractUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-verdict-green"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-verdict-green animate-pulse" />
              StudioNet
            </a>
          )}
          {!hasContract && (
            <span className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-partial-amber">
              <span className="w-1.5 h-1.5 rounded-full bg-partial-amber" />
              No contract
            </span>
          )}
          <button
            onClick={isConnected ? disconnect : connect}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-glass-line font-mono text-xs transition-all hover:border-ivory-record/30"
          >
            {isConnected ? (
              <>
                <Wallet size={12} className="text-signal-cyan" />
                <span className="text-signal-cyan">{shortAddr(account!)}</span>
                <X size={10} className="text-ink-grey" />
              </>
            ) : (
              <>
                <Wallet size={12} className="text-ink-grey" />
                <span className="text-ink-grey">Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
