"use client";

import { ExternalLink } from "lucide-react";

interface Props {
  href: string;
  label?: string;
}

export default function ExplorerLink({ href, label = "View on Chain" }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 font-mono text-xs transition-colors hover:opacity-70"
      style={{ color: "var(--verdict-gold)" }}
    >
      <ExternalLink size={11} />
      {label}
    </a>
  );
}
