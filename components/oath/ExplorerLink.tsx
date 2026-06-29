"use client";

import { ExternalLink } from "lucide-react";

interface Props {
  href: string;
  label?: string;
}

export default function ExplorerLink({ href, label = "View on Explorer" }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-signal-cyan hover:text-signal-cyan/80 font-mono text-xs transition-colors"
    >
      <ExternalLink size={12} />
      {label}
    </a>
  );
}
