"use client";

const PREFIX = "oracleboard:tx";

export function saveTx(startupId: string, key: "dossier" | "review" | "memo" | "roundUpdate" | "rereview", txHash: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${PREFIX}:${startupId}:${key}`, txHash);
}

export function getTx(startupId: string, key: "dossier" | "review" | "memo" | "roundUpdate" | "rereview"): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${PREFIX}:${startupId}:${key}`);
}

export function saveRecentStartup(startupId: string) {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem("oracleboard:recent") || "[]";
  try {
    const ids: string[] = JSON.parse(raw);
    const filtered = ids.filter((id) => id !== startupId);
    filtered.unshift(startupId);
    localStorage.setItem("oracleboard:recent", JSON.stringify(filtered.slice(0, 10)));
  } catch {
    localStorage.setItem("oracleboard:recent", JSON.stringify([startupId]));
  }
}

export function getRecentStartups(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("oracleboard:recent") || "[]");
  } catch {
    return [];
  }
}

export function saveDraft(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`oracleboard:draft:${key}`, JSON.stringify(data));
}

export function getDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`oracleboard:draft:${key}`);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`oracleboard:draft:${key}`);
}
