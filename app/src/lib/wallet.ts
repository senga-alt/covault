import { useCallback, useEffect, useState } from "react";
import { connect, disconnect, getLocalStorage, isConnected } from "@stacks/connect";

// Thin wrapper over @stacks/connect v8. The connected STX address (or null).
function readAddress(): string | null {
  if (!isConnected()) return null;
  const data = getLocalStorage();
  return data?.addresses?.stx?.[0]?.address ?? null;
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(() => readAddress());
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // reflect connects/disconnects done in other tabs
    const onStorage = () => setAddress(readAddress());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const doConnect = useCallback(async () => {
    setConnecting(true);
    try {
      await connect();
      setAddress(readAddress());
    } finally {
      setConnecting(false);
    }
  }, []);

  const doDisconnect = useCallback(() => {
    disconnect();
    setAddress(null);
  }, []);

  return { address, connecting, connect: doConnect, disconnect: doDisconnect };
}
