import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OathStatus } from "./genlayer/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDeadline(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isPastDeadline(unix: number): boolean {
  return Date.now() / 1000 > unix;
}

export function statusColor(status: OathStatus | string): string {
  switch (status) {
    case "fulfilled": return "text-verdict-green";
    case "partial": return "text-partial-amber";
    case "missed": return "text-breach-red";
    case "active": return "text-signal-cyan";
    case "excluded": return "text-signal-cyan";
    default: return "text-ink-grey";
  }
}

export function statusLabel(status: OathStatus | string): string {
  const map: Record<string, string> = {
    active: "Active",
    fulfilled: "Fulfilled",
    partial: "Partial",
    missed: "Missed",
    unverifiable: "Unverifiable",
    invalid_oath: "Invalid Oath",
    not_due: "Not Due",
    excluded: "Excluded",
    needs_more_evidence: "Needs Evidence",
  };
  return map[status] || status;
}

export function judgeabilityScore(data: {
  deadline_unix?: number;
  success_criteria?: string;
  required_deliverables?: string;
  accepted_sources?: string;
  exclusions?: string;
  promise?: string;
}): number {
  let score = 0;
  if (data.deadline_unix && data.deadline_unix > 0) score += 20;
  if (data.success_criteria && data.success_criteria.length > 30) score += 20;
  if (data.required_deliverables && data.required_deliverables.length > 10) score += 15;
  if (data.accepted_sources && data.accepted_sources.length > 10) score += 20;
  if (data.exclusions && data.exclusions.length > 5) score += 10;
  if (data.promise && data.promise.length > 50) score += 15;
  return score;
}

export const DEMO_OATHS = [
  {
    oath_id: -1,
    creator: "0xdemo000000000000000000000000000000000001",
    title: "Public Beta Launch",
    promise:
      "The team will launch a public beta of the app before July 31, including wallet login, a dashboard, and a working demo flow accessible to the public.",
    deadline_unix: Math.floor(new Date("2025-07-31").getTime() / 1000),
    success_criteria:
      "A public URL must be live before the deadline. Wallet login, dashboard, and demo flow must be accessible without private invite approval.",
    required_deliverables: "Public URL, wallet login page, dashboard, demo flow",
    accepted_sources: "Official website, GitHub release, public announcement post, product demo URL",
    exclusions: "Scheduled third-party infrastructure outage lasting more than 24 hours.",
    stakeholder_notes: "Announced publicly on Twitter and Discord.",
    category: "Product Launch",
    created_at: Math.floor(Date.now() / 1000) - 86400 * 10,
    status: "active" as OathStatus,
    settled: false,
    appeal_count: 0,
  },
  {
    oath_id: -2,
    creator: "0xdemo000000000000000000000000000000000002",
    title: "Grant Milestone 1",
    promise:
      "The grantee will deliver the first working prototype with public documentation and a deployed demo before the milestone date.",
    deadline_unix: Math.floor(new Date("2025-06-15").getTime() / 1000),
    success_criteria:
      "Working prototype deployed publicly. Documentation available on GitHub or docs site.",
    required_deliverables: "GitHub repo, deployed demo URL, documentation",
    accepted_sources: "GitHub, docs site, product URL",
    exclusions: "None",
    stakeholder_notes: "DAO grant #44",
    category: "Grant",
    created_at: Math.floor(Date.now() / 1000) - 86400 * 20,
    status: "fulfilled" as OathStatus,
    settled: true,
    appeal_count: 0,
  },
  {
    oath_id: -3,
    creator: "0xdemo000000000000000000000000000000000003",
    title: "Agent Research Delivery",
    promise:
      "The research agent will produce a public report with at least five primary sources and a clear recommendation by the deadline.",
    deadline_unix: Math.floor(new Date("2025-08-01").getTime() / 1000),
    success_criteria:
      "Public report URL, minimum five primary sources cited, clear final recommendation section.",
    required_deliverables: "Public report, source list, recommendation",
    accepted_sources: "Public report URL, GitHub, published blog",
    exclusions: "None",
    stakeholder_notes: "AI agent task for research initiative",
    category: "Research",
    created_at: Math.floor(Date.now() / 1000) - 86400 * 5,
    status: "active" as OathStatus,
    settled: false,
    appeal_count: 0,
  },
];
