"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { formatIsoDate, shortAddr } from "@/lib/utils";
import type { EvidencePacket } from "@/lib/genlayer/types";

interface Props {
  evidence: EvidencePacket[];
}

const sideConfig = {
  fulfilment: {
    label: "Supports Fulfilment",
    color: "#19C37D",
    bg: "rgba(25,195,125,0.06)",
    border: "rgba(25,195,125,0.25)",
  },
  challenge: {
    label: "Challenges Fulfilment",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.06)",
    border: "rgba(239,68,68,0.25)",
  },
  context: {
    label: "Adds Context",
    color: "#8A93A5",
    bg: "rgba(138,147,165,0.06)",
    border: "rgba(138,147,165,0.25)",
  },
  exclusion: {
    label: "Supports Exclusion",
    color: "#28D7FF",
    bg: "rgba(40,215,255,0.06)",
    border: "rgba(40,215,255,0.25)",
  },
};

export default function EvidenceWall({ evidence }: Props) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-12 text-ink-grey font-mono text-sm">
        No evidence submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {evidence.map((ev, i) => {
          const cfg = sideConfig[ev.side] || sideConfig.context;
          return (
            <motion.div
              key={ev.evidence_id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg p-4 border"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="font-mono text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        color: cfg.color,
                        background: `${cfg.color}18`,
                        border: `1px solid ${cfg.color}40`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span className="font-mono text-xs text-ink-grey capitalize">{ev.source_type}</span>
                  </div>
                  <p className="text-ivory-record text-sm leading-relaxed mb-2">{ev.claim}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={ev.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-mono text-xs hover:opacity-80 transition-opacity"
                      style={{ color: cfg.color }}
                    >
                      <ExternalLink size={10} />
                      <span className="max-w-[200px] truncate">{ev.source_url}</span>
                    </a>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: cfg.border }}>
                <span className="font-mono text-xs text-ink-grey">
                  {shortAddr(ev.submitter)}
                </span>
                <span className="font-mono text-xs text-ink-grey">
                  {formatIsoDate(ev.submitted_at)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
