"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface WalletContextValue {
  account: `0x${string}` | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

const WalletContext = createContext<WalletContextValue>({
  account: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  error: null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        setError("No wallet detected. Please install MetaMask or a compatible wallet.");
        return;
      }
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Wallet connection failed";
      setError(msg);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setError(null);
  }, []);

  // Auto-reconnect on page load if MetaMask is already authorized
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      const list = accounts as string[];
      if (list.length > 0) setAccount(list[0] as `0x${string}`);
    }).catch(() => {});

    // Keep in sync if user switches account or disconnects in MetaMask
    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      setAccount(list.length > 0 ? (list[0] as `0x${string}`) : null);
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  return (
    <WalletContext.Provider
      value={{ account, isConnected: !!account, connect, disconnect, error }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
