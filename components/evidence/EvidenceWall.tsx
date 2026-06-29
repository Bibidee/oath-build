"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { formatIsoDate, shortAddr } from "@/lib/utils";
import type { EvidencePacket } from "@/lib/genlayer/types";

const SIDE: Record<string, { label: string; color: string; role: string }> = {
  fulfilment: { label: "Supports Fulfilment",   color: "var(--verdict-green)",  role: "Witness for" },
  challenge:  { label: "Challenges Fulfilment",  color: "var(--breach-red)",     role: "Witness against" },
  context:    { label: "Adds Context",           color: "var(--ash)",             role: "Context" },
  exclusion:  { label: "Supports Exclusion",     color: "#4A9EDB",               role: "Exclusion" },
};

export default function EvidenceWall({ evidence }: { evidence: EvidencePacket[] }) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="font-mono text-xs text-ash">No witnesses have come forward.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {evidence.map((ev, i) => {
          const cfg = SIDE[ev.side] || SIDE.context;
          return (
            <motion.div
              key={ev.evidence_id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded border"
              style={{ borderColor: `${cfg.color}25`, background: `${cfg.color}06` }}
            >
              {/* Witness card header */}
              <div className="px-4 py-2.5 border-b flex items-center justify-between"
                   style={{ borderColor: `${cfg.color}15` }}>
                <span className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="font-mono text-xs text-ash capitalize">{ev.source_type}</span>
              </div>

              {/* Claim */}
              <div className="px-4 py-3">
                <p className="text-parchment-dim text-sm leading-relaxed break-words">{ev.claim}</p>
                <a
                  href={ev.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs mt-2 hover:opacity-70 transition-opacity break-all"
                  style={{ color: cfg.color }}
                >
                  <ExternalLink size={10} />
                  <span className="max-w-[200px] truncate">{ev.source_url}</span>
                </a>
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t flex items-center justify-between"
                   style={{ borderColor: `${cfg.color}15` }}>
                <span className="font-mono text-xs text-ash">{shortAddr(ev.submitter)}</span>
                <span className="font-mono text-xs text-ash">{formatIsoDate(ev.submitted_at)}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
