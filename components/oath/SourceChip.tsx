"use client";

import { ExternalLink } from "lucide-react";
import type { EvidenceSide } from "@/lib/genlayer/types";

interface Props {
  url: string;
  side: EvidenceSide;
  label?: string;
}

const sideStyle: Record<EvidenceSide, string> = {
  fulfilment: "bg-verdict-green/10 text-verdict-green border-verdict-green/30",
  challenge: "bg-breach-red/10 text-breach-red border-breach-red/30",
  context: "bg-ink-grey/10 text-ink-grey border-ink-grey/30",
  exclusion: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/30",
};

const sideLabel: Record<EvidenceSide, string> = {
  fulfilment: "↑ Fulfilment",
  challenge: "↓ Challenge",
  context: "~ Context",
  exclusion: "⊘ Exclusion",
};

export default function SourceChip({ url, side, label }: Props) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 border rounded px-2 py-1 font-mono text-xs transition-opacity hover:opacity-80 ${sideStyle[side]}`}
    >
      <span>{sideLabel[side]}</span>
      <span className="opacity-60">·</span>
      <span className="max-w-[160px] truncate">{label || url}</span>
      <ExternalLink size={10} className="shrink-0" />
    </a>
  );
}
