"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, Plus, Wallet, ExternalLink } from "lucide-react";
import { useWallet } from "@/lib/context/WalletContext";

const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/startups/new", label: "Submit Dossier", icon: Plus },
];

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function Sidebar() {
  const pathname = usePathname();
  const { address, isConnecting, connect, disconnect } = useWallet();

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-graphite min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <Link href="/overview" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded bg-[rgba(214,178,94,0.15)] border border-[rgba(214,178,94,0.3)] flex items-center justify-center">
            <span className="text-gold text-xs font-mono font-bold">OB</span>
          </div>
          <div>
            <div className="text-sm font-heading font-semibold text-memo leading-none">OracleBoard</div>
            <div className="text-[10px] text-slate font-mono mt-0.5 leading-none">Investment Committee</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/overview" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-[rgba(214,178,94,0.1)] text-gold border border-[rgba(214,178,94,0.2)]"
                  : "text-slate hover:text-memo hover:bg-[rgba(255,255,255,0.04)]"
              )}
            >
              <Icon size={14} />
              <span className="font-body">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* GenLayer link */}
      <div className="px-3 pb-2">
        <a
          href="https://explorer-studio.genlayer.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-xs text-slate hover:text-memo transition-colors rounded hover:bg-[rgba(255,255,255,0.04)]"
        >
          <ExternalLink size={11} />
          <span className="font-mono">GenLayer Explorer</span>
        </a>
      </div>

      {/* Wallet */}
      <div className="px-3 py-4 border-t border-border">
        {address ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[rgba(86,243,154,0.06)] border border-[rgba(86,243,154,0.15)]">
              <div className="w-1.5 h-1.5 rounded-full bg-signal" />
              <span className="font-mono text-[10px] text-signal">{shortAddr(address)}</span>
            </div>
            <button
              onClick={disconnect}
              className="w-full text-left px-3 py-1 text-xs text-slate hover:text-risk transition-colors font-mono"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={isConnecting}
            className="w-full flex items-center gap-2 px-3 py-2 rounded bg-[rgba(214,178,94,0.1)] border border-[rgba(214,178,94,0.25)] text-gold text-xs font-mono hover:bg-[rgba(214,178,94,0.18)] transition-colors disabled:opacity-50"
          >
            <Wallet size={12} />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </aside>
  );
}
