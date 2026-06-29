"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";
import { shortAddr } from "@/lib/utils";
import { getExplorerContractUrl } from "@/lib/genlayer/client";

const links = [
  { href: "/oaths",    label: "Ledger" },
  { href: "/arena",    label: "Judgment Arena" },
  { href: "/receipts", label: "Receipts" },
];

export default function Nav() {
  const pathname = usePathname();
  const { account, isConnected, connect, disconnect } = useWallet();
  const hasContract = !!process.env.NEXT_PUBLIC_OATH_CONTRACT_ADDRESS;

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-[var(--rule-line)] bg-[var(--ink)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="var(--seal-red)" strokeWidth="1.5"/>
            <circle cx="11" cy="11" r="7" stroke="var(--seal-red)" strokeWidth="0.5" strokeDasharray="2 2"/>
            <path d="M11 5v12M7 8l4-3 4 3" stroke="var(--seal-red)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <span className="font-display text-lg text-parchment tracking-wide leading-none">Oath</span>
            <span className="font-mono text-[10px] text-ash hidden sm:block leading-none mt-0.5 tracking-widest uppercase">The Ledger Court</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-mono text-xs tracking-widest uppercase transition-colors ${
                pathname.startsWith(l.href)
                  ? "text-parchment border-b border-verdict-gold pb-0.5"
                  : "text-ash hover:text-parchment-dim"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right cluster */}
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

          <Link
            href="/create"
            className="hidden sm:flex items-center gap-2 px-4 py-1.5 border border-seal-red/50 text-seal-red-bright hover:bg-seal-red/10 transition-all font-mono text-xs tracking-widest uppercase rounded"
          >
            Draft an Oath
          </Link>

          <button
            onClick={isConnected ? disconnect : connect}
            className="flex items-center gap-2 px-3 py-1.5 border border-[var(--rule-line)] font-mono text-xs transition-all hover:border-parchment-dim/40 rounded"
          >
            {isConnected ? (
              <>
                <Wallet size={11} className="text-verdict-gold" />
                <span className="text-parchment-dim">{shortAddr(account!)}</span>
                <X size={9} className="text-ash" />
              </>
            ) : (
              <>
                <Wallet size={11} className="text-ash" />
                <span className="text-ash">Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
