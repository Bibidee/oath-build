import { clsx } from "clsx";
import { ExternalLink } from "lucide-react";
import type { StartupRecord } from "@/lib/genlayer/types";

interface TxEntry {
  dossier: string | null;
  review: string | null;
  roundUpdate: string | null;
  rereview: string | null;
}

interface TimelineProps {
  record: StartupRecord;
  txHashes: TxEntry;
}

type Phase =
  | "DOSSIER_SUBMITTED"
  | "UNDER_REVIEW"
  | "MEMO_ISSUED"
  | "ROUND_UPDATE_SUBMITTED"
  | "REREVIEW_PENDING"
  | "REREVIEW_COMPLETED";

function getPhase(record: StartupRecord): Phase {
  const { dossier, evaluation, rereview_result } = record;
  if (rereview_result?.rereview_status === "REREVIEW_READY") return "REREVIEW_COMPLETED";
  if (rereview_result?.rereview_status === "REREVIEW_PENDING") return "REREVIEW_PENDING";
  if (dossier.latest_update_id) return "ROUND_UPDATE_SUBMITTED";
  if (evaluation || dossier.review_status === "MEMO_READY") return "MEMO_ISSUED";
  if (dossier.review_status === "CONSENSUS_PENDING") return "UNDER_REVIEW";
  return "DOSSIER_SUBMITTED";
}

const PHASES: { phase: Phase; label: string; active?: boolean }[] = [
  { phase: "DOSSIER_SUBMITTED", label: "Dossier Submitted" },
  { phase: "UNDER_REVIEW", label: "Consensus Evaluation", active: true },
  { phase: "MEMO_ISSUED", label: "Investment Memo Issued" },
  { phase: "ROUND_UPDATE_SUBMITTED", label: "Round Update Submitted" },
  { phase: "REREVIEW_PENDING", label: "Re-review Pending", active: true },
  { phase: "REREVIEW_COMPLETED", label: "Re-review Completed" },
];

const PHASE_ORDER: Phase[] = [
  "DOSSIER_SUBMITTED",
  "UNDER_REVIEW",
  "MEMO_ISSUED",
  "ROUND_UPDATE_SUBMITTED",
  "REREVIEW_PENDING",
  "REREVIEW_COMPLETED",
];

function shortHash(hash: string) {
  return hash.slice(0, 6) + "..." + hash.slice(-4);
}

export function Timeline({ record, txHashes }: TimelineProps) {
  const currentPhase = getPhase(record);
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);
  const contractAddr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  const phaseTx: Partial<Record<Phase, string | null>> = {
    DOSSIER_SUBMITTED: txHashes.dossier,
    UNDER_REVIEW: txHashes.review,
    MEMO_ISSUED: txHashes.review,
    ROUND_UPDATE_SUBMITTED: txHashes.roundUpdate,
    REREVIEW_COMPLETED: txHashes.rereview,
  };

  return (
    <div className="space-y-1">
      {PHASES.map(({ phase, label, active }) => {
        const phaseIdx = PHASE_ORDER.indexOf(phase);
        const isPast = phaseIdx < currentIdx;
        const isCurrent = phase === currentPhase;
        const isFuture = phaseIdx > currentIdx;
        const tx = phaseTx[phase];

        return (
          <div
            key={phase}
            className={clsx(
              "flex items-start gap-3 px-4 py-3 rounded transition-colors",
              isCurrent && "bg-[rgba(214,178,94,0.06)] border border-[rgba(214,178,94,0.15)]",
              isPast && "opacity-60",
              isFuture && "opacity-30"
            )}
          >
            {/* Dot */}
            <div className="mt-0.5 flex-shrink-0">
              <div
                className={clsx(
                  "w-2 h-2 rounded-full mt-1",
                  isPast && "bg-signal",
                  isCurrent && active && "bg-gold blink",
                  isCurrent && !active && "bg-gold",
                  isFuture && "bg-[#2D3748]"
                )}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-body text-memo">{label}</div>
              {tx && (
                <a
                  href={`https://explorer-studio.genlayer.com/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-mono text-slate hover:text-gold transition-colors"
                >
                  {shortHash(tx)}
                  <ExternalLink size={9} />
                </a>
              )}
              {isCurrent && contractAddr && phase === "DOSSIER_SUBMITTED" && (
                <a
                  href={`https://explorer-studio.genlayer.com/address/${contractAddr}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-0.5 ml-3 text-[10px] font-mono text-slate hover:text-gold transition-colors"
                >
                  Contract
                  <ExternalLink size={9} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
